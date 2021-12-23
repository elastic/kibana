/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { isEmpty, without } from 'lodash/fp';
import pMap from 'p-map';
import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { useUserPrivileges } from '../../../../../../common/components/user_privileges';
import { PolicyData } from '../../../../../../../common/endpoint/types';
import { useHttp, useToasts } from '../../../../../../common/lib/kibana';
import { SearchExceptions } from '../../../../../components/search_exceptions';
import { updateOneHostIsolationExceptionItem } from '../../../../host_isolation_exceptions/service';
import { useFetchHostIsolationExceptionsList } from '../../../../host_isolation_exceptions/view/hooks';
import { PolicyArtifactsAssignableList } from '../../artifacts/assignable';

const MAX_ALLOWED_RESULTS = 100;

export const PolicyHostIsolationExceptionsAssignFlyout = ({
  policy,
  onClose,
}: {
  policy: PolicyData;
  onClose: () => void;
}) => {
  const http = useHttp();
  const toasts = useToasts();
  const queryClient = useQueryClient();
  const privileges = useUserPrivileges().endpointPrivileges;

  useEffect(() => {
    if (!privileges.canIsolateHost) {
      onClose();
    }
  }, [onClose, privileges.canIsolateHost]);

  const [selectedArtifactIds, setSelectedArtifactIds] = useState<string[]>([]);
  const [currentFilter, setCurrentFilter] = useState('');

  const onUpdateSuccesss = (updatedExceptions: ExceptionListItemSchema[]) => {
    if (updatedExceptions.length > 0) {
      toasts.addSuccess({
        title: i18n.translate(
          'xpack.securitySolution.endpoint.policy.hostIsolationExceptions.layout.flyout.toastSuccess.title',
          {
            defaultMessage: 'Success',
          }
        ),
        text:
          updatedExceptions.length > 1
            ? i18n.translate(
                'xpack.securitySolution.endpoint.policy.hostIsolationExceptions.layout.flyout.toastSuccess.textMultiples',
                {
                  defaultMessage: '{count} host isolation exceptions have been added to your list.',
                  values: { count: updatedExceptions.length },
                }
              )
            : i18n.translate(
                'xpack.securitySolution.endpoint.policy.hostIsolationExceptions.layout.flyout.toastSuccess.textSingle',
                {
                  defaultMessage: '"{name}" has been added to your host isolation exceptions list.',
                  values: { name: updatedExceptions[0].name },
                }
              ),
      });
    }
  };

  const onUpdateError = () => {
    toasts.addDanger(
      i18n.translate(
        'xpack.securitySolution.endpoint.policy.hostIsolationExceptions.layout.flyout.toastError.text',
        {
          defaultMessage: `An error occurred updating artifacts`,
        }
      )
    );
  };

  const exceptionsRequest = useFetchHostIsolationExceptionsList({
    excludedPolicies: [policy.id, 'all'],
    page: 0,
    filter: currentFilter,
    perPage: MAX_ALLOWED_RESULTS,
  });

  const allPossibleExceptionsRequest = useFetchHostIsolationExceptionsList({
    excludedPolicies: [policy.id, 'all'],
    page: 0,
    perPage: MAX_ALLOWED_RESULTS,
    // only request if there's a filter and no results from the regular request
    enabled: currentFilter !== '' && exceptionsRequest.data?.total === 0,
  });

  const mutation = useMutation(
    () => {
      const toMutate = exceptionsRequest.data?.data.filter((exception) => {
        return selectedArtifactIds.includes(exception.id);
      });

      if (toMutate === undefined) {
        return Promise.reject(new Error('no exceptions selected'));
      }

      return pMap(
        toMutate,
        (exception) => {
          exception.tags = [...exception.tags, `policy:${policy.id}`];
          return updateOneHostIsolationExceptionItem(http, exception);
        },
        {
          concurrency: 10,
        }
      );
    },
    {
      onSuccess: onUpdateSuccesss,
      onError: onUpdateError,
      onSettled: () => {
        queryClient.invalidateQueries(['endpointSpecificPolicies']);
        queryClient.invalidateQueries(['hostIsolationExceptions']);
        onClose();
      },
    }
  );

  const handleOnConfirmAction = () => {
    mutation.mutate();
  };

  const handleOnSearch = (term: string) => {
    // reset existing selection
    setSelectedArtifactIds([]);
    setCurrentFilter(term);
  };

  const handleSelectArtifact = (artifactId: string, selected: boolean) => {
    setSelectedArtifactIds((currentSelectedArtifactIds) =>
      selected
        ? [...currentSelectedArtifactIds, artifactId]
        : without([artifactId], currentSelectedArtifactIds)
    );
  };

  const searchWarningMessage = useMemo(
    () => (
      <>
        <EuiCallOut
          data-test-subj="hostIsolationExceptions-too-many-results"
          color="warning"
          size="s"
          heading="h4"
          title={i18n.translate(
            'xpack.securitySolution.endpoint.policy.hostIsolationExceptions.layout.flyout.searchWarning.title',
            {
              defaultMessage: 'Limited search results',
            }
          )}
        >
          {i18n.translate(
            'xpack.securitySolution.endpoint.policy.hostIsolationExceptions.layout.flyout.searchWarning.text',
            {
              defaultMessage:
                'Only the first 100 host isolation exceptions are displayed. Please use the search bar to refine the results.',
            }
          )}
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    ),
    []
  );

  const noItemsMessage = useMemo(() => {
    if (exceptionsRequest.isLoading || allPossibleExceptionsRequest.isLoading) {
      return null;
    }

    // there are no host isolation exceptions assignable to this policy
    if (
      allPossibleExceptionsRequest.data?.total === 0 ||
      (exceptionsRequest.data?.total === 0 && currentFilter === '')
    ) {
      return (
        <EuiEmptyPrompt
          data-test-subj="hostIsolationExceptions-no-assignable-items"
          title={
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.hostIsolationExceptions.layout.flyout.noAssignable"
              defaultMessage="There are no host isolation exceptions that can be assigned to this policy."
            />
          }
        />
      );
    }

    // there are no results for the current search
    if (exceptionsRequest.data?.total === 0) {
      return (
        <EuiEmptyPrompt
          data-test-subj="hostIsolationExceptions-no-items-found"
          title={
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.hostIsolationExceptions.layout.flyout.noResults"
              defaultMessage="No items found"
            />
          }
        />
      );
    }
  }, [
    allPossibleExceptionsRequest.data?.total,
    allPossibleExceptionsRequest.isLoading,
    currentFilter,
    exceptionsRequest.data?.total,
    exceptionsRequest.isLoading,
  ]);

  // do not render if doesn't have adecuate privleges
  if (!privileges.loading && !privileges.canIsolateHost) {
    return null;
  }

  return (
    <EuiFlyout onClose={onClose} data-test-subj="hostIsolationExceptions-assign-flyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.hostIsolationExceptions.layout.flyout.title"
              defaultMessage="Assign host isolation exceptions"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        <FormattedMessage
          id="xpack.securitySolution.endpoint.policy.hostIsolationExceptions.layout.flyout.subtitle"
          defaultMessage="Select host isolation exceptions to add to {policyName}"
          values={{ policyName: policy.name }}
        />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {(exceptionsRequest.data?.total || 0) > MAX_ALLOWED_RESULTS ? searchWarningMessage : null}
        <SearchExceptions
          onSearch={handleOnSearch}
          placeholder={i18n.translate(
            'xpack.securitySolution.endpoint.policy.hostIsolationExceptions.layout.searh.label',
            {
              defaultMessage: 'Search host isolation exceptions',
            }
          )}
          hideRefreshButton
        />
        <EuiSpacer size="m" />

        <PolicyArtifactsAssignableList
          data-test-subj="hostIsolationExceptions-assignable-list"
          artifacts={exceptionsRequest.data}
          selectedArtifactIds={selectedArtifactIds}
          isListLoading={exceptionsRequest.isLoading}
          selectedArtifactsUpdated={handleSelectArtifact}
        />

        {noItemsMessage}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="hostIsolationExceptions-assign-cancel-button"
              onClick={onClose}
            >
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policy.hostIsolationExceptions.layout.flyout.cancel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              className="eui-textTruncate"
              style={{ maxWidth: '300px' }}
              data-test-subj="hostIsolationExceptions-assign-confirm-button"
              fill
              onClick={handleOnConfirmAction}
              isLoading={exceptionsRequest.isLoading || mutation.isLoading}
              disabled={isEmpty(selectedArtifactIds)}
              title={policy.name}
            >
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policy.hostIsolationExceptions.layout.flyout.confirm"
                defaultMessage="Assign to {policyName}"
                values={{
                  policyName: policy.name,
                }}
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
