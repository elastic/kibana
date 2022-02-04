/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
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
});

interface ArtifactFormComponentProps {
  item: object;
  mode: 'edit' | 'create';
  /** signals that the form should be made disabled (ex. during update) */
  disabled: boolean;
  /** reports the state of the form data and the current updated item */
  onChange(formStatus: { isValid: boolean; item: object }): void;
}

export interface ArtifactFlyoutProps {
  apiClient: unknown; // ExceptionsListApiClient; // FIXME:PT use api client type
  FormComponent: React.ComponentType<ArtifactFormComponentProps>;
  onCancel(): void;
  onSuccess(): void;
  /**
   * If the artifact data is provided and it matches the id in the URL, then it will not be
   * retrieved again via the API
   */
  artifact?: ExceptionListItemSchema;
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
    FormComponent,
    labels: _labels = {},
    showExpiredLicenseBanner = false,
    'data-test-subj': dataTestSubj,
    size = 'm',
  }) => {
    // FIXME:PT should handle cases where we find the `id` to be invalid (show toast, close flyout)
    // FIXME:PT should the flyout be made `reusable` for use cases where it gets opened in other areas of security (like Event filters)
    // FIXME:PT handle cases where the "create" does not call the actual create api (ex. upload) (maybe defer from first iteration

    const getTestId = useTestIdGenerator(dataTestSubj);
    const isFlyoutOpened = useIsFlyoutOpened();
    const setUrlParams = useSetUrlParams();
    const { urlParams } = useUrlParams<{
      id?: string;
      show?: string;
      [key: string]: string | undefined;
    }>();

    const labels = useMemo<typeof ARTIFACT_FLYOUT_LABELS>(() => {
      return {
        ...ARTIFACT_FLYOUT_LABELS,
        ..._labels,
      };
    }, [_labels]);

    const isEditFlow = urlParams.show === 'edit';

    const handleFlyoutClose = useCallback(() => {
      // FIXME:PT Question: Prevent closing it if update is underway?

      const { id, show, ...others } = urlParams;
      setUrlParams(others, true);
    }, [setUrlParams, urlParams]);

    const handleSubmitClick = useCallback(() => {
      // FIXME: implement submit
    }, []);

    if (!isFlyoutOpened) {
      return null;
    }

    return (
      // FIXME:PT implement onClose
      <EuiFlyout size={size} onClose={handleFlyoutClose} data-test-subj={dataTestSubj}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>{isEditFlow ? labels.flyoutEditTitle : labels.flyoutCreateTitle}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        {showExpiredLicenseBanner && (
          <EuiCallOut
            title={i18n.translate('xpack.securitySolution.eventFilters.expiredLicenseTitle', {
              defaultMessage: 'Expired License',
            })}
            color="warning"
            iconType="help"
            data-test-subj={getTestId('expiredLicenseCallout')}
          >
            {labels.flyoutDowngradedLicenseInfo}
          </EuiCallOut>
        )}

        <EuiFlyoutBody>
          <FormComponent
            onChange={() => {}}
            disabled={false}
            item={{}}
            mode={(urlParams.show ?? 'create') as ArtifactFormComponentProps['mode']}
          />
        </EuiFlyoutBody>

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
                disabled={false}
                onClick={handleSubmitClick}
                isLoading={false}
              >
                {isEditFlow
                  ? labels.flyoutEditSubmitButtonLabel
                  : labels.flyoutCreateSubmitButtonLabel}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);
MaybeArtifactFlyout.displayName = 'MaybeArtifactFlyout';
