/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
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

export interface ArtifactFlyoutProps {
  apiClient: unknown; // ExceptionsListApiClient; // FIXME:PT use api client type
  FormComponent: React.ComponentType; // FIXME:PT define expected props interface
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
    // FIXME:PT handle cases where the "create" does not call the actual create api (ex. upload)

    const getTestId = useTestIdGenerator(dataTestSubj);
    const isFlyoutOpened = useIsFlyoutOpened();

    const labels = useMemo<typeof ARTIFACT_FLYOUT_LABELS>(() => {
      return {
        ...ARTIFACT_FLYOUT_LABELS,
        ..._labels,
      };
    }, [_labels]);

    const {
      urlParams: { id, show },
    } = useUrlParams<{
      id?: string;
      show?: string;
    }>();

    const isEditFlow = show === 'edit';

    if (!isFlyoutOpened) {
      return null;
    }

    return (
      // FIXME:PT implement onClose
      <EuiFlyout size={size} onClose={() => {}} data-test-subj={dataTestSubj}>
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
          <FormComponent />
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              {/* FIXME:PT implement cancel onclick handler */}
              <EuiButtonEmpty data-test-subj={getTestId('cancelButton')} onClick={() => {}}>
                {labels.flyoutCancelButtonLabel}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {/*
                FIXME:PT implement disabled property
                FIXME:PT implement click handler
                FIXME:PT implement isLoading
               */}
              <EuiButton
                data-test-subj={getTestId('submitButton')}
                fill
                disabled={false}
                onClick={() => {}}
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
