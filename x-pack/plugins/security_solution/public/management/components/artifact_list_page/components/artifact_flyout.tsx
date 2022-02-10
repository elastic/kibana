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
    'xpack.securitySolution.artifactListPage.flyoutCreateSubmitButtonLabel',
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
  flyoutEditItemLoadFailure: (errorMessage: string) =>
    i18n.translate('xpack.securitySolution.flyoutEditItemLoadFailure', {
      defaultMessage: 'Failed to retrieve item for edit. Reason: {errorMessage}',
      values: { errorMessage },
    }),
});

const createFormInitialState = (
  listId: string,
  item: ArtifactFormComponentOnChangeCallbackProps['item']
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
  showExpiredLicenseBanner?: boolean;
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
    showExpiredLicenseBanner = false, // FIXME:PT can can calculate this in here, right, rather than have a prop
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

    const {
      isLoading: isLoadingItemForEdit,
      error,
      refetch: fetchItemForEdit,
    } = useArtifactGetItem(apiClient, urlParams.itemId ?? '', false);

    const [formState, setFormState] = useState<ArtifactFormComponentOnChangeCallbackProps>(
      createFormInitialState.bind(apiClient.listId, item)
    );

    const hasItemDataForEdit = useMemo<boolean>(() => {
      // `item_id` will not be defined for a `create` flow, so we use it below to determine if we
      // are still attempting to load the item for edit from the api
      return !!(item || formState.item.item_id);
    }, [formState.item.item_id, item]);

    const isInitializing = useMemo(() => {
      return isEditFlow && !hasItemDataForEdit;
    }, [hasItemDataForEdit, isEditFlow]);

    const handleFlyoutClose = useCallback(() => {
      // FIXME:PT Question: Prevent closing it if update is underway?

      // `undefined` will cause params to be dropped from url
      setUrlParams({ id: undefined, show: undefined }, true);
    }, [setUrlParams]);

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
      // FIXME: implement submit
    }, []);

    // If we don't have the actual Artifact data yet for edit (in initialization phase - ex. came in with an
    // ID in the url that was not in the list), then retrieve it now
    useEffect(() => {
      if (isEditFlow && !hasItemDataForEdit && !error && isInitializing && !isLoadingItemForEdit) {
        fetchItemForEdit().then(({ data: editItemData }) => {
          setFormState(createFormInitialState(apiClient.listId, editItemData));
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

        {showExpiredLicenseBanner && (
          <EuiCallOut
            title={labels.flyoutDowngradedLicenseTitle}
            color="warning"
            iconType="help"
            data-test-subj={getTestId('expiredLicenseCallout')}
          >
            {labels.flyoutDowngradedLicenseInfo}
          </EuiCallOut>
        )}

        <EuiFlyoutBody>
          {isInitializing && <ManagementPageLoader data-test-subj={getTestId('pageLoader')} />}

          {!isInitializing && (
            <FormComponent
              onChange={handleFormComponentOnChange}
              disabled={false} // FIXME:PT implement
              item={formState.item}
              mode={(isEditFlow ? 'edit' : 'create') as ArtifactFormComponentProps['mode']}
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
                >
                  {labels.flyoutCancelButtonLabel}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {/*
                FIXME:PT implement disabled property
                FIXME:PT implement isLoading
               */}
                <EuiButton
                  data-test-subj={getTestId('submitButton')}
                  fill
                  disabled={!formState.isValid}
                  onClick={handleSubmitClick}
                  isLoading={false} // FIXME:PT implement loading indicator
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
