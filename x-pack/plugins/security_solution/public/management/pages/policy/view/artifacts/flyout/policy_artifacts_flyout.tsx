/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useQueryClient } from 'react-query';
import { isEmpty, without } from 'lodash/fp';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import {
  EuiTitle,
  EuiFlyout,
  EuiSpacer,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
} from '@elastic/eui';
import { SearchExceptions } from '../../../../../components/search_exceptions';
import { ImmutableObject, PolicyData } from '../../../../../../../common/endpoint/types';
import { useToasts } from '../../../../../../common/lib/kibana';
import { PolicyArtifactsAssignableList } from '../../artifacts/assignable';
import { ExceptionsListApiClient } from '../../../../../services/exceptions_list/exceptions_list_api_client';
import { useListArtifact, useBulkUpdateArtifact } from '../../../../../hooks/artifacts';

interface PolicyArtifactsFlyoutProps {
  policyItem: ImmutableObject<PolicyData>;
  apiClient: ExceptionsListApiClient;
  searcheableFields: string[];
  onClose: () => void;
}

const MAX_ALLOWED_RESULTS = 100;

export const PolicyArtifactsFlyout = React.memo<PolicyArtifactsFlyoutProps>(
  ({ policyItem, apiClient, searcheableFields, onClose }) => {
    const toasts = useToasts();
    const queryClient = useQueryClient();
    const [selectedArtifactIds, setSelectedArtifactIds] = useState<string[]>([]);
    const [currentFilter, setCurrentFilter] = useState<string>('');

    const bulkUpdateMutation = useBulkUpdateArtifact(apiClient, {
      onSuccess: (updatedExceptions: ExceptionListItemSchema[]) => {
        toasts.addSuccess({
          title: i18n.translate(
            'xpack.securitySolution.endpoint.policy.artifacts.layout.flyout.toastSuccess.title',
            {
              defaultMessage: 'Success',
            }
          ),
          text:
            updatedExceptions.length > 1
              ? i18n.translate(
                  'xpack.securitySolution.endpoint.policy.artifacts.layout.flyout.toastSuccess.textMultiples',
                  {
                    defaultMessage: '{count} [artifacts] have been added to your list.',
                    values: { count: updatedExceptions.length },
                  }
                )
              : i18n.translate(
                  'xpack.securitySolution.endpoint.policy.artifacts.layout.flyout.toastSuccess.textSingle',
                  {
                    defaultMessage: '"{name}" has been added to your [artifacts] list.',
                    values: { name: updatedExceptions[0].name },
                  }
                ),
        });
      },
      onError: () => {
        toasts.addDanger(
          i18n.translate(
            'xpack.securitySolution.endpoint.policy.artifacts.layout.flyout.toastError.text',
            {
              defaultMessage: `An error occurred updating artifacts`,
            }
          )
        );
      },
      onSettled: () => {
        queryClient.invalidateQueries(['list', apiClient]);
        onClose();
      },
    });

    const {
      data: artifacts,
      isLoading: isLoadingArtifacts,
      isRefetching: isRefetchingArtifacts,
    } = useListArtifact(apiClient, searcheableFields, {
      perPage: MAX_ALLOWED_RESULTS,
      filter: currentFilter,
      excludedPolicies: [policyItem.id, 'global'],
    });

    const { data: allNotAssigned, isLoading: isLoadingAllNotAssigned } = useListArtifact(
      apiClient,
      searcheableFields,
      {
        excludedPolicies: [policyItem.id, 'global'],
      },
      {
        enabled: currentFilter !== '' && artifacts?.total === 0,
      }
    );

    const handleOnSearch = useCallback((query) => {
      setSelectedArtifactIds([]);
      setCurrentFilter(query);
    }, []);

    const handleOnConfirmAction = useCallback(() => {
      if (!artifacts) {
        return;
      }
      const artifactssToUpdate: ExceptionListItemSchema[] = [];
      selectedArtifactIds.forEach((selectedId) => {
        const artifact = artifacts.data.find((current) => current.id === selectedId);
        if (artifact) {
          artifact.tags = [...artifact.tags, `policy:${policyItem.id}`];
          artifactssToUpdate.push(artifact);
        }
      });
      bulkUpdateMutation.mutate(artifactssToUpdate);
    }, [bulkUpdateMutation, artifacts, policyItem.id, selectedArtifactIds]);

    const handleSelectArtifacts = (artifactId: string, selected: boolean) => {
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
            data-test-subj="artifacts-too-many-results"
            color="warning"
            size="s"
            heading="h4"
            title={i18n.translate(
              'xpack.securitySolution.endpoint.policy.artifacts.layout.flyout.searchWarning.title',
              {
                defaultMessage: 'Limited search results',
              }
            )}
          >
            {i18n.translate(
              'xpack.securitySolution.endpoint.policy.artifacts.layout.flyout.searchWarning.text',
              {
                defaultMessage:
                  'Only the first 100 [artifacts] are displayed. Please use the search bar to refine the results.',
              }
            )}
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      ),
      []
    );

    const noItemsMessage = useMemo(() => {
      if (isLoadingArtifacts || isRefetchingArtifacts || isLoadingAllNotAssigned) {
        return null;
      }

      // there are no artifacts assignable to this policy
      if (allNotAssigned?.total === 0 || (artifacts?.total === 0 && currentFilter === '')) {
        return (
          <EuiEmptyPrompt
            data-test-subj="artifacts-no-assignable-items"
            title={
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policy.artifacts.layout.flyout.noAssignable"
                defaultMessage="There are no [artifacts] that can be assigned to this policy."
              />
            }
          />
        );
      }

      // there are no results for the current search
      if (artifacts?.total === 0) {
        return (
          <EuiEmptyPrompt
            data-test-subj="artifacts-no-items-found"
            title={
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policy.artifacts.layout.flyout.noResults"
                defaultMessage="No items found"
              />
            }
          />
        );
      }
    }, [
      allNotAssigned?.total,
      currentFilter,
      artifacts?.total,
      isLoadingAllNotAssigned,
      isLoadingArtifacts,
      isRefetchingArtifacts,
    ]);

    return (
      <EuiFlyout onClose={onClose} data-test-subj="artifacts-assign-flyout">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.policy.artifacts.layout.flyout.title"
                defaultMessage="Assign [artifacts]"
              />
            </h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policy.artifacts.layout.flyout.subtitle"
            defaultMessage="Select [artifacts] to add to {policyName}"
            values={{ policyName: policyItem.name }}
          />
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {(artifacts?.total || 0) > MAX_ALLOWED_RESULTS ? searchWarningMessage : null}
          <SearchExceptions
            onSearch={handleOnSearch}
            placeholder={i18n.translate(
              'xpack.securitySolution.endpoint.policy.artifacts.layout.searh.label',
              {
                defaultMessage: 'Search [artifacts]',
              }
            )}
            hideRefreshButton
          />
          <EuiSpacer size="m" />

          <PolicyArtifactsAssignableList
            data-test-subj="artifacts-assignable-list"
            artifacts={artifacts}
            selectedArtifactIds={selectedArtifactIds}
            isListLoading={isLoadingArtifacts || isRefetchingArtifacts}
            selectedArtifactsUpdated={handleSelectArtifacts}
          />

          {noItemsMessage}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty data-test-subj="artifacts-assign-cancel-button" onClick={onClose}>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.policy.artifacts.layout.flyout.cancel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                className="eui-textTruncate"
                style={{ maxWidth: '300px' }}
                data-test-subj="artifacts-assign-confirm-button"
                fill
                onClick={handleOnConfirmAction}
                isLoading={
                  bulkUpdateMutation.isLoading || isLoadingArtifacts || isRefetchingArtifacts
                }
                disabled={isEmpty(selectedArtifactIds)}
                title={policyItem.name}
              >
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.policy.artifacts.layout.flyout.confirm"
                  defaultMessage="Assign to {policyName}"
                  values={{
                    policyName: policyItem.name,
                  }}
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);

PolicyArtifactsFlyout.displayName = 'PolicyArtifactsFlyout';
