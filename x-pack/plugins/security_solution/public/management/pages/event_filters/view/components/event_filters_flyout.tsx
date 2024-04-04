/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useEffect, useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextColor,
  useEuiTheme,
} from '@elastic/eui';
import { lastValueFrom } from 'rxjs';

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { EuiOverlayMaskProps } from '@elastic/eui/src/components/overlay_mask';
import { useWithArtifactSubmitData } from '../../../../components/artifact_list_page/hooks/use_with_artifact_submit_data';
import type {
  ArtifactFormComponentOnChangeCallbackProps,
  ArtifactFormComponentProps,
} from '../../../../components/artifact_list_page/types';
import { EventFiltersForm } from './form';

import { getInitialExceptionFromEvent } from '../utils';
import { useHttp, useKibana, useToasts } from '../../../../../common/lib/kibana';
import { useGetEndpointSpecificPolicies } from '../../../../services/policies/hooks';
import { getLoadPoliciesError } from '../../../../common/translations';

import { EventFiltersApiClient } from '../../service/api_client';
import { getCreationSuccessMessage, getCreationErrorMessage } from '../translations';
export interface EventFiltersFlyoutProps {
  data?: Ecs;
  onCancel(): void;
  maskProps?: EuiOverlayMaskProps;
}

export const EventFiltersFlyout: React.FC<EventFiltersFlyoutProps> = memo(
  ({ onCancel: onClose, data, ...flyoutProps }) => {
    const { euiTheme } = useEuiTheme();

    const toasts = useToasts();
    const http = useHttp();

    const { isLoading: isSubmittingData, mutateAsync: submitData } = useWithArtifactSubmitData(
      EventFiltersApiClient.getInstance(http),
      'create'
    );

    const [enrichedData, setEnrichedData] = useState<Ecs | null>();
    const [isFormValid, setIsFormValid] = useState(false);
    const {
      data: { search },
    } = useKibana().services;

    // load the list of policies>
    const policiesRequest = useGetEndpointSpecificPolicies({
      perPage: 1000,
      onError: (error) => {
        toasts.addWarning(getLoadPoliciesError(error));
      },
    });

    const [exception, setException] = useState<ArtifactFormComponentProps['item']>(
      getInitialExceptionFromEvent(data)
    );

    const policiesIsLoading = useMemo<boolean>(
      () => policiesRequest.isLoading || policiesRequest.isRefetching,
      [policiesRequest]
    );

    useEffect(() => {
      const enrichEvent = async () => {
        if (!data || !data._index) return;
        const searchResponse = await lastValueFrom(
          search.search({
            params: {
              index: data._index,
              body: {
                query: {
                  match: {
                    _id: data._id,
                  },
                },
              },
            },
          })
        );
        setEnrichedData({
          ...data,
          host: {
            ...data.host,
            os: {
              ...(data?.host?.os || {}),
              name: [searchResponse.rawResponse.hits.hits[0]._source.host.os.name],
            },
          },
        });
      };

      if (data) {
        enrichEvent();
      }

      return () => {
        setException(getInitialExceptionFromEvent());
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleOnClose = useCallback(() => {
      if (policiesIsLoading || isSubmittingData) return;
      onClose();
    }, [isSubmittingData, policiesIsLoading, onClose]);

    const handleOnSubmit = useCallback(() => {
      return submitData(exception, {
        onSuccess: (result) => {
          toasts.addSuccess(getCreationSuccessMessage(result));
          onClose();
        },
        onError: (error) => {
          toasts.addError(error, getCreationErrorMessage(error));
        },
      });
    }, [exception, onClose, submitData, toasts]);

    const confirmButtonMemo = useMemo(
      () => (
        <EuiButton
          data-test-subj="add-exception-confirm-button"
          fill
          disabled={
            !isFormValid || isSubmittingData || (!!data && !enrichedData) || policiesIsLoading
          }
          onClick={handleOnSubmit}
          isLoading={policiesIsLoading}
        >
          {data ? (
            <FormattedMessage
              id="xpack.securitySolution.eventFilters.eventFiltersFlyout.actions.confirm.update.withData"
              defaultMessage="Add endpoint event filter"
            />
          ) : (
            <FormattedMessage
              id="xpack.securitySolution.eventFilters.eventFiltersFlyout.actions.confirm.create"
              defaultMessage="Add event filter"
            />
          )}
        </EuiButton>
      ),
      [data, enrichedData, handleOnSubmit, isFormValid, isSubmittingData, policiesIsLoading]
    );

    // update flyout state with form state
    const onChange = useCallback((formState?: ArtifactFormComponentOnChangeCallbackProps) => {
      if (!formState) return;
      setIsFormValid(formState.isValid);
      setException(formState.item);
    }, []);

    return (
      <EuiFlyout
        size="l"
        onClose={handleOnClose}
        data-test-subj="eventFiltersCreateFlyout"
        {...flyoutProps}
        // EUI TODO: This z-index override of EuiOverlayMask is a workaround, and ideally should be resolved with a cleaner UI/UX flow long-term
        maskProps={{ style: `z-index: ${(euiTheme.levels.flyout as number) + 3}` }} // we need this flyout to be above the timeline flyout (which has a z-index of 1002)
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              {data ? (
                <FormattedMessage
                  id="xpack.securitySolution.eventFilters.eventFiltersFlyout.title.create.withData"
                  defaultMessage="Add endpoint event filter"
                />
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.eventFilters.eventFiltersFlyout.subtitle.create"
                  defaultMessage="Add event filter"
                />
              )}
            </h2>
          </EuiTitle>
          {data ? (
            <EuiTextColor color="subdued">
              <FormattedMessage
                id="xpack.securitySolution.eventFilters.eventFiltersFlyout.subtitle.create.withData"
                defaultMessage="Endpoint security"
              />
            </EuiTextColor>
          ) : null}
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          <EventFiltersForm
            allowSelectOs={!data}
            error={undefined}
            disabled={false}
            item={exception}
            mode="create"
            onChange={onChange}
            policies={policiesRequest?.data?.items ?? []}
            policiesIsLoading={policiesIsLoading}
          />
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                isDisabled={isSubmittingData}
                data-test-subj="cancelExceptionAddButton"
                onClick={handleOnClose}
              >
                <FormattedMessage
                  id="xpack.securitySolution.eventFilters.eventFiltersFlyout.actions.cancel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{confirmButtonMemo}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);

EventFiltersFlyout.displayName = 'EventFiltersFlyout';
