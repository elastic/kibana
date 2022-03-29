/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { DocLinks } from '@kbn/doc-links';
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
import { HttpFetchError } from 'kibana/public';
import { useUrlParams } from '../../hooks/use_url_params';
import { useIsFlyoutOpened } from '../hooks/use_is_flyout_opened';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import { useSetUrlParams } from '../hooks/use_set_url_params';
import {
  ArtifactFormComponentOnChangeCallbackProps,
  ArtifactFormComponentProps,
  ArtifactListPageUrlParams,
} from '../types';
import { ManagementPageLoader } from '../../management_page_loader';
import { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';
import { useKibana, useToasts } from '../../../../common/lib/kibana';
import { createExceptionListItemForCreate } from '../../../../../common/endpoint/service/artifacts/utils';
import { useWithArtifactSubmitData } from '../hooks/use_with_artifact_submit_data';
import { useIsArtifactAllowedPerPolicyUsage } from '../hooks/use_is_artifact_allowed_per_policy_usage';
import { useIsMounted } from '../../hooks/use_is_mounted';
import { useGetArtifact } from '../../../hooks/artifacts';
import type { PolicyData } from '../../../../../common/endpoint/types';

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
  flyoutDowngradedLicenseDocsInfo: (
    securitySolutionDocsLinks: DocLinks['securitySolution']
  ): React.ReactNode =>
    i18n.translate('xpack.securitySolution.artifactListPage.flyoutDowngradedLicenseDocsInfo', {
      defaultMessage: 'For more information, see our documentation.',
    }),

  flyoutEditItemLoadFailure: (errorMessage: string): string =>
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
  flyoutCreateSubmitSuccess: ({ name }: ExceptionListItemSchema): string =>
    i18n.translate('xpack.securitySolution.some_page.flyoutCreateSubmitSuccess', {
      defaultMessage: '"{name}" has been added.',
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
  flyoutEditSubmitSuccess: ({ name }: ExceptionListItemSchema): string =>
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
  policies: PolicyData[];
  policiesIsLoading: boolean;
  onSuccess(): void;
  onClose(): void;
  submitHandler?: (
    item: ArtifactFormComponentOnChangeCallbackProps['item'],
    mode: ArtifactFormComponentProps['mode']
  ) => Promise<ExceptionListItemSchema>;
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
export const ArtifactFlyout = memo<ArtifactFlyoutProps>(
  ({
    apiClient,
    item,
    policies,
    policiesIsLoading,
    FormComponent,
    onSuccess,
    onClose,
    submitHandler,
    labels: _labels = {},
    'data-test-subj': dataTestSubj,
    size = 'm',
  }) => {
    const {
      docLinks: {
        links: { securitySolution },
      },
    } = useKibana().services;
    const getTestId = useTestIdGenerator(dataTestSubj);
    const toasts = useToasts();
    const isFlyoutOpened = useIsFlyoutOpened();
    const setUrlParams = useSetUrlParams();
    const { urlParams } = useUrlParams<ArtifactListPageUrlParams>();
    const isMounted = useIsMounted();
    const labels = useMemo<typeof ARTIFACT_FLYOUT_LABELS>(() => {
      return {
        ...ARTIFACT_FLYOUT_LABELS,
        ..._labels,
      };
    }, [_labels]);
    // TODO:PT Refactor internal/external state into the `useEithArtifactSucmitData()` hook
    const [externalIsSubmittingData, setExternalIsSubmittingData] = useState<boolean>(false);
    const [externalSubmitHandlerError, setExternalSubmitHandlerError] = useState<
      HttpFetchError | undefined
    >(undefined);

    const isEditFlow = urlParams.show === 'edit';
    const formMode: ArtifactFormComponentProps['mode'] = isEditFlow ? 'edit' : 'create';

    const {
      isLoading: internalIsSubmittingData,
      mutateAsync: submitData,
      error: internalSubmitError,
    } = useWithArtifactSubmitData(apiClient, formMode);

    const isSubmittingData = useMemo(() => {
      return submitHandler ? externalIsSubmittingData : internalIsSubmittingData;
    }, [externalIsSubmittingData, internalIsSubmittingData, submitHandler]);

    const submitError = useMemo(() => {
      return submitHandler ? externalSubmitHandlerError : internalSubmitError;
    }, [externalSubmitHandlerError, internalSubmitError, submitHandler]);

    const {
      isLoading: isLoadingItemForEdit,
      error,
      refetch: fetchItemForEdit,
    } = useGetArtifact(apiClient, urlParams.itemId ?? '', undefined, {
      // We don't want to run this at soon as the component is rendered. `refetch` is called
      // a little later if determined we're in `edit` mode
      enabled: false,
    });

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
      setUrlParams({ ...urlParams, itemId: undefined, show: undefined }, true);

      onClose();
    }, [isSubmittingData, onClose, setUrlParams, urlParams]);

    const handleFormComponentOnChange: ArtifactFormComponentProps['onChange'] = useCallback(
      ({ item: updatedItem, isValid }) => {
        if (isMounted) {
          setFormState({
            item: updatedItem,
            isValid,
          });
        }
      },
      [isMounted]
    );

    const handleSuccess = useCallback(
      (result: ExceptionListItemSchema) => {
        toasts.addSuccess(
          isEditFlow
            ? labels.flyoutEditSubmitSuccess(result)
            : labels.flyoutCreateSubmitSuccess(result)
        );

        if (isMounted) {
          // Close the flyout
          // `undefined` will cause params to be dropped from url
          setUrlParams({ ...urlParams, itemId: undefined, show: undefined }, true);

          onSuccess();
        }
      },
      [isEditFlow, isMounted, labels, onSuccess, setUrlParams, toasts, urlParams]
    );

    const handleSubmitClick = useCallback(() => {
      if (submitHandler) {
        setExternalIsSubmittingData(true);

        submitHandler(formState.item, formMode)
          .then(handleSuccess)
          .catch((submitHandlerError) => {
            if (isMounted) {
              setExternalSubmitHandlerError(submitHandlerError);
            }
          })
          .finally(() => {
            if (isMounted) {
              setExternalIsSubmittingData(false);
            }
          });
      } else {
        submitData(formState.item).then(handleSuccess);
      }
    }, [formMode, formState.item, handleSuccess, isMounted, submitData, submitHandler]);

    // If we don't have the actual Artifact data yet for edit (in initialization phase - ex. came in with an
    // ID in the url that was not in the list), then retrieve it now
    useEffect(() => {
      if (isEditFlow && !hasItemDataForEdit && !error && isInitializing && !isLoadingItemForEdit) {
        fetchItemForEdit().then(({ data: editItemData }) => {
          if (editItemData && isMounted) {
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
      isMounted,
    ]);

    // If we got an error while trying ot retrieve the item for edit, then show a toast message
    useEffect(() => {
      if (isEditFlow && error) {
        toasts.addWarning(labels.flyoutEditItemLoadFailure(error?.body?.message || error.message));

        // Blank out the url params for id and show (will close out the flyout)
        setUrlParams({ itemId: undefined, show: undefined });
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
            {`${labels.flyoutDowngradedLicenseInfo} ${labels.flyoutDowngradedLicenseDocsInfo(
              securitySolution
            )}`}
          </EuiCallOut>
        )}

        <EuiFlyoutBody>
          {isInitializing && <ManagementPageLoader data-test-subj={getTestId('loader')} />}

          {!isInitializing && (
            <FormComponent
              onChange={handleFormComponentOnChange}
              disabled={isSubmittingData}
              item={formState.item}
              error={submitError ?? undefined}
              mode={formMode}
              policies={policies}
              policiesIsLoading={policiesIsLoading}
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
ArtifactFlyout.displayName = 'ArtifactFlyout';
