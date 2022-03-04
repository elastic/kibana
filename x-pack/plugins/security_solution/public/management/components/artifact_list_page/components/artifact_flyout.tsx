/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { EuiFlyoutSize } from '@elastic/eui/src/components/flyout/flyout';
import { useUrlParams } from '../hooks/use_url_params';
import { useIsFlyoutOpened } from '../hooks/use_is_flyout_opened';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import { useSetUrlParams } from '../hooks/use_set_url_params';
import { useArtifactGetItem } from '../hooks/use_artifact_get_item';
import {
  ArtifactFormComponentOnChangeCallbackProps,
  ArtifactFormComponentProps,
  ArtifactListPageUrlParams,
} from '../types';
import { ManagementPageLoader } from '../../management_page_loader';
import { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';
import { useToasts } from '../../../../common/lib/kibana';
import { createExceptionListItemForCreate } from '../../../../../common/endpoint/service/artifacts/utils';
import { useWithArtifactSubmitData } from '../hooks/use_with_artifact_submit_data';
import { useIsArtifactAllowedPerPolicyUsage } from '../hooks/use_is_artifact_allowed_per_policy_usage';

export const ARTIFACT_FLYOUT_LABELS = Object.freeze({
  flyoutEditTitle: i18n.translate('xpack.securitySolution.artifactListPage.flyoutEditTitle', {
    defaultMessage: 'Add artifact',
  }),

  flyoutCreateTitle: i18n.translate('xpack.securitySolution.artifactListPage.flyoutCreateTitle', {
    defaultMessage: 'Create artifact',
  }),
  flyoutCancelButtonLabel: i18n.translate(
    'xpack.securitySolution.artifactListPage.flyoutCancelButtonLabel',
    {
      defaultMessage: 'Cancel',
    }
  ),
  flyoutCreateSubmitButtonLabel: i18n.translate(
    'xpack.securitySolution.artifactListPage.flyoutCreateSubmitButtonLabel',
    { defaultMessage: 'Add' }
  ),
  flyoutEditSubmitButtonLabel: i18n.translate(
    'xpack.securitySolution.artifactListPage.flyoutEditSubmitButtonLabel',
    { defaultMessage: 'Save' }
  ),
  flyoutDowngradedLicenseTitle: i18n.translate(
    'xpack.securitySolution.artifactListPage.expiredLicenseTitle',
    {
      defaultMessage: 'Expired License',
    }
  ),
  flyoutDowngradedLicenseInfo: i18n.translate(
    'xpack.securitySolution.artifactListPage.flyoutDowngradedLicenseInfo',
    {
      defaultMessage:
        'Your Kibana license has been downgraded. Future policy configurations will now be globally assigned to all policies.',
    }
  ),
  /**
   * This should be set to a sentence that includes a link to the documentation page for this specific artifact type.
   *
   * @example
   * // in a component
   * () => {
   *   const { docLinks } = useKibana().services;
   *   return (
   *     <FormattedMessage
   *        id="some-id-1"
   *        defaultMessage="For more information, see our {link}."
   *        value={{
   *          link: <EuiLink target="_blank" href={`${docLinks.links.securitySolution.eventFilters}`}>
   *            <FormattedMessage id="dome-id-2" defaultMessage="Event filters documentation" />
   *          </EuiLink>
   *        }}
   *     />
   *   );
   * }
   */
  flyoutDowngradedLicenseDocsInfo: (): React.ReactNode =>
    i18n.translate('xpack.securitySolution.artifactListPage.flyoutDowngradedLicenseDocsInfo', {
      defaultMessage: 'For more information, see our documentation.',
    }),

  flyoutEditItemLoadFailure: (errorMessage: string) =>
    i18n.translate('xpack.securitySolution.artifactListPage.flyoutEditItemLoadFailure', {
      defaultMessage: 'Failed to retrieve item for edit. Reason: {errorMessage}',
      values: { errorMessage },
    }),

  /**
   * A function returning the label for the success message toast
   * @param itemName
   * @example
   *  ({ name }) => i18n.translate('xpack.securitySolution.some_page.flyoutCreateSubmitSuccess', {
   *    defaultMessage: '"{name}" has been added.',
   *    values: { name },
   *  })
   */
  flyoutCreateSubmitSuccess: ({ name }: ExceptionListItemSchema) =>
    i18n.translate('xpack.securitySolution.some_page.flyoutCreateSubmitSuccess', {
      defaultMessage: '"{name}" has been added to your event filters.',
      values: { name },
    }),

  /**
   * Returns the edit success message for the toast
   * @param item
   * @example
   *  ({ name }) =>
   *    i18n.translate('xpack.securitySolution.some_page.flyoutEditSubmitSuccess', {
   *    defaultMessage: '"{name}" has been updated.',
   *    values: { name },
   *  })
   */
  flyoutEditSubmitSuccess: ({ name }: ExceptionListItemSchema) =>
    i18n.translate('xpack.securitySolution.artifactListPage.flyoutEditSubmitSuccess', {
      defaultMessage: '"{name}" has been updated.',
      values: { name },
    }),
});

const createFormInitialState = (
  listId: string,
  item: ArtifactFormComponentOnChangeCallbackProps['item'] | undefined
): ArtifactFormComponentOnChangeCallbackProps => {
  return {
    isValid: false,
    item: item ?? createExceptionListItemForCreate(listId),
  };
};

export interface ArtifactFlyoutProps {
  apiClient: ExceptionsListApiClient;
  FormComponent: React.ComponentType<ArtifactFormComponentProps>;
  onSuccess(): void;
  /**
   * If the artifact data is provided and it matches the id in the URL, then it will not be
   * retrieved again via the API
   */
  item?: ExceptionListItemSchema;
  /** Any label overrides */
  labels?: Partial<typeof ARTIFACT_FLYOUT_LABELS>;
  'data-test-subj'?: string;
  size?: EuiFlyoutSize;
}

/**
 * Show the flyout based on URL params
 */
export const MaybeArtifactFlyout = memo<ArtifactFlyoutProps>(
  ({
    apiClient,
    item,
    FormComponent,
    onSuccess,
    labels: _labels = {},
    'data-test-subj': dataTestSubj,
    size = 'm',
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const toasts = useToasts();
    const isFlyoutOpened = useIsFlyoutOpened();
    const setUrlParams = useSetUrlParams();
    const { urlParams } = useUrlParams<ArtifactListPageUrlParams>();
    const labels = useMemo<typeof ARTIFACT_FLYOUT_LABELS>(() => {
      return {
        ...ARTIFACT_FLYOUT_LABELS,
        ..._labels,
      };
    }, [_labels]);

    const isEditFlow = urlParams.show === 'edit';
    const formMode: ArtifactFormComponentProps['mode'] = isEditFlow ? 'edit' : 'create';

    const {
      isLoading: isSubmittingData,
      mutateAsync: submitData,
      error: submitError,
    } = useWithArtifactSubmitData(apiClient, formMode);

    const {
      isLoading: isLoadingItemForEdit,
      error,
      refetch: fetchItemForEdit,
    } = useArtifactGetItem(apiClient, urlParams.itemId ?? '', false);

    const [formState, setFormState] = useState<ArtifactFormComponentOnChangeCallbackProps>(
      createFormInitialState.bind(null, apiClient.listId, item)
    );
    const showExpiredLicenseBanner = useIsArtifactAllowedPerPolicyUsage(
      { tags: formState.item.tags ?? [] },
      formMode
    );

    const hasItemDataForEdit = useMemo<boolean>(() => {
      // `item_id` will not be defined for a `create` flow, so we use it below to determine if we
      // are still attempting to load the item for edit from the api
      return !!item || !!formState.item.item_id;
    }, [formState.item.item_id, item]);

    const isInitializing = useMemo(() => {
      return isEditFlow && !hasItemDataForEdit;
    }, [hasItemDataForEdit, isEditFlow]);

    const handleFlyoutClose = useCallback(() => {
      if (isSubmittingData) {
        return;
      }

      // `undefined` will cause params to be dropped from url
      setUrlParams({ id: undefined, show: undefined }, true);
    }, [isSubmittingData, setUrlParams]);

    const handleFormComponentOnChange: ArtifactFormComponentProps['onChange'] = useCallback(
      ({ item: updatedItem, isValid }) => {
        setFormState({
          item: updatedItem,
          isValid,
        });
      },
      []
    );

    const handleSubmitClick = useCallback(() => {
      submitData(formState.item).then((result) => {
        toasts.addSuccess(
          isEditFlow
            ? labels.flyoutEditSubmitSuccess(result)
            : labels.flyoutCreateSubmitSuccess(result)
        );

        // Close the flyout
        // `undefined` will cause params to be dropped from url
        setUrlParams({ id: undefined, show: undefined }, true);
      });
    }, [formState.item, isEditFlow, labels, setUrlParams, submitData, toasts]);

    // If we don't have the actual Artifact data yet for edit (in initialization phase - ex. came in with an
    // ID in the url that was not in the list), then retrieve it now
    useEffect(() => {
      if (isEditFlow && !hasItemDataForEdit && !error && isInitializing && !isLoadingItemForEdit) {
        fetchItemForEdit().then(({ data: editItemData }) => {
          if (editItemData) {
            setFormState(createFormInitialState(apiClient.listId, editItemData));
          }
        });
      }
    }, [
      apiClient.listId,
      error,
      fetchItemForEdit,
      isEditFlow,
      isInitializing,
      isLoadingItemForEdit,
      hasItemDataForEdit,
    ]);

    // If we got an error while trying ot retrieve the item for edit, then show a toast message
    useEffect(() => {
      if (isEditFlow && error) {
        toasts.addWarning(labels.flyoutEditItemLoadFailure(error?.body?.message || error.message));

        // Blank out the url params for id and show (will close out the flyout)
        setUrlParams({ id: undefined, show: undefined });
      }
    }, [error, isEditFlow, labels, setUrlParams, toasts, urlParams.itemId]);

    if (!isFlyoutOpened || error) {
      return null;
    }

    return (
      <EuiFlyout size={size} onClose={handleFlyoutClose} data-test-subj={dataTestSubj}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>{isEditFlow ? labels.flyoutEditTitle : labels.flyoutCreateTitle}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        {!isInitializing && showExpiredLicenseBanner && (
          <EuiCallOut
            title={labels.flyoutDowngradedLicenseTitle}
            color="warning"
            iconType="help"
            data-test-subj={getTestId('expiredLicenseCallout')}
          >
            {`${labels.flyoutDowngradedLicenseInfo} ${labels.flyoutDowngradedLicenseDocsInfo()}`}
          </EuiCallOut>
        )}

        <EuiFlyoutBody>
          {isInitializing && <ManagementPageLoader data-test-subj={getTestId('pageLoader')} />}

          {!isInitializing && (
            <FormComponent
              onChange={handleFormComponentOnChange}
              disabled={isSubmittingData}
              item={formState.item}
              error={submitError ?? undefined}
              mode={formMode}
            />
          )}
        </EuiFlyoutBody>

        {!isInitializing && (
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj={getTestId('cancelButton')}
                  onClick={handleFlyoutClose}
                  disabled={isSubmittingData}
                >
                  {labels.flyoutCancelButtonLabel}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj={getTestId('submitButton')}
                  fill
                  disabled={!formState.isValid || isSubmittingData}
                  onClick={handleSubmitClick}
                  isLoading={isSubmittingData}
                >
                  {isEditFlow
                    ? labels.flyoutEditSubmitButtonLabel
                    : labels.flyoutCreateSubmitButtonLabel}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        )}
      </EuiFlyout>
    );
  }
);
MaybeArtifactFlyout.displayName = 'MaybeArtifactFlyout';
