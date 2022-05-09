/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useEffect, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Dispatch } from 'redux';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
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
  EuiCallOut,
  EuiLink,
} from '@elastic/eui';
import { lastValueFrom } from 'rxjs';
import { AppAction } from '../../../../../../common/store/actions';
import { EventFiltersForm } from '../form';
import { useEventFiltersSelector, useEventFiltersNotification } from '../../hooks';
import {
  getFormEntryStateMutable,
  getFormHasError,
  isCreationInProgress,
  isCreationSuccessful,
} from '../../../store/selector';
import { getInitialExceptionFromEvent } from '../../../store/utils';
import { Ecs } from '../../../../../../../common/ecs';
import { useKibana, useToasts } from '../../../../../../common/lib/kibana';
import { useGetEndpointSpecificPolicies } from '../../../../../services/policies/hooks';
import { getLoadPoliciesError } from '../../../../../common/translations';
import { useLicense } from '../../../../../../common/hooks/use_license';
import { isGlobalPolicyEffected } from '../../../../../components/effected_policy_select/utils';

export interface EventFiltersFlyoutProps {
  type?: 'create' | 'edit';
  id?: string;
  data?: Ecs;
  onCancel(): void;
  maskProps?: {
    style?: string;
  };
}

export const EventFiltersFlyout: React.FC<EventFiltersFlyoutProps> = memo(
  ({ onCancel, id, type = 'create', data, ...flyoutProps }) => {
    useEventFiltersNotification();
    const [enrichedData, setEnrichedData] = useState<Ecs | null>();
    const toasts = useToasts();
    const dispatch = useDispatch<Dispatch<AppAction>>();
    const formHasError = useEventFiltersSelector(getFormHasError);
    const creationInProgress = useEventFiltersSelector(isCreationInProgress);
    const creationSuccessful = useEventFiltersSelector(isCreationSuccessful);
    const exception = useEventFiltersSelector(getFormEntryStateMutable);
    const {
      data: { search },
      docLinks,
    } = useKibana().services;

    // load the list of policies>
    const policiesRequest = useGetEndpointSpecificPolicies({
      perPage: 1000,
      onError: (error) => {
        toasts.addWarning(getLoadPoliciesError(error));
      },
    });

    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const isEditMode = useMemo(() => type === 'edit' && !!id, [type, id]);
    const [wasByPolicy, setWasByPolicy] = useState<boolean | undefined>(undefined);

    const showExpiredLicenseBanner = useMemo(() => {
      return !isPlatinumPlus && isEditMode && wasByPolicy;
    }, [isPlatinumPlus, isEditMode, wasByPolicy]);

    useEffect(() => {
      if (exception && wasByPolicy === undefined) {
        setWasByPolicy(!isGlobalPolicyEffected(exception?.tags));
      }
    }, [exception, wasByPolicy]);

    useEffect(() => {
      if (creationSuccessful) {
        onCancel();
        dispatch({
          type: 'eventFiltersFormStateChanged',
          payload: {
            type: 'UninitialisedResourceState',
          },
        });
      }
    }, [creationSuccessful, onCancel, dispatch]);

    // Initialize the store with the id passed as prop to allow render the form. It acts as componentDidMount
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

      if (type === 'edit' && !!id) {
        dispatch({
          type: 'eventFiltersInitFromId',
          payload: { id },
        });
      } else if (data) {
        enrichEvent();
      } else {
        dispatch({
          type: 'eventFiltersInitForm',
          payload: { entry: getInitialExceptionFromEvent() },
        });
      }

      return () => {
        dispatch({
          type: 'eventFiltersFormStateChanged',
          payload: {
            type: 'UninitialisedResourceState',
          },
        });
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Initialize the store with the enriched event to allow render the form
    useEffect(() => {
      if (enrichedData) {
        dispatch({
          type: 'eventFiltersInitForm',
          payload: { entry: getInitialExceptionFromEvent(enrichedData) },
        });
      }
    }, [dispatch, enrichedData]);

    const handleOnCancel = useCallback(() => {
      if (creationInProgress) return;
      onCancel();
    }, [creationInProgress, onCancel]);

    const confirmButtonMemo = useMemo(
      () => (
        <EuiButton
          data-test-subj="add-exception-confirm-button"
          fill
          disabled={
            formHasError ||
            creationInProgress ||
            (!!data && !enrichedData) ||
            policiesRequest.isLoading ||
            policiesRequest.isRefetching
          }
          onClick={() =>
            id
              ? dispatch({ type: 'eventFiltersUpdateStart' })
              : dispatch({ type: 'eventFiltersCreateStart' })
          }
          isLoading={creationInProgress}
        >
          {id ? (
            <FormattedMessage
              id="xpack.securitySolution.eventFilters.eventFiltersFlyout.actions.confirm.update"
              defaultMessage="Save"
            />
          ) : data ? (
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
      [formHasError, creationInProgress, data, enrichedData, id, dispatch, policiesRequest]
    );

    return (
      <EuiFlyout
        size="l"
        onClose={handleOnCancel}
        data-test-subj="eventFiltersCreateEditFlyout"
        {...flyoutProps}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              {id ? (
                <FormattedMessage
                  id="xpack.securitySolution.eventFilters.eventFiltersFlyout.subtitle.update"
                  defaultMessage="Update event filter"
                />
              ) : data ? (
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

        {showExpiredLicenseBanner && (
          <EuiCallOut
            title={i18n.translate('xpack.securitySolution.eventFilters.expiredLicenseTitle', {
              defaultMessage: 'Expired License',
            })}
            color="warning"
            iconType="help"
            data-test-subj="expired-license-callout"
          >
            <FormattedMessage
              id="xpack.securitySolution.eventFilters.expiredLicenseMessage"
              defaultMessage="Your Kibana license has been downgraded. Future policy configurations will now be globally assigned to all policies. For more information, see our "
            />
            <EuiLink target="_blank" href={`${docLinks.links.securitySolution.eventFilters}`}>
              <FormattedMessage
                id="xpack.securitySolution.eventFilters.docsLink"
                defaultMessage="Event filters documentation."
              />
            </EuiLink>
          </EuiCallOut>
        )}

        <EuiFlyoutBody>
          <EventFiltersForm
            allowSelectOs={!data}
            policies={policiesRequest?.data?.items ?? []}
            arePoliciesLoading={policiesRequest.isLoading || policiesRequest.isRefetching}
          />
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty data-test-subj="cancelExceptionAddButton" onClick={handleOnCancel}>
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
