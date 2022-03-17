/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { METRIC_TYPE } from '@kbn/analytics';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiCallOut,
} from '@elastic/eui';

import {
  EnrichedDeprecationInfo,
  ClusterSettingAction,
  ResponseError,
} from '../../../../../../common/types';
import { uiMetricService, UIM_CLUSTER_SETTINGS_DELETE_CLICK } from '../../../../lib/ui_metric';
import type { Status } from '../../../types';
import { DeprecationFlyoutLearnMoreLink, DeprecationBadge } from '../../../shared';

export interface RemoveClusterSettingsFlyoutProps {
  deprecation: EnrichedDeprecationInfo;
  closeFlyout: () => void;
  removeClusterSettings: (settings: string[]) => Promise<void>;
  status: {
    statusType: Status;
    details?: ResponseError;
  };
}

const i18nTexts = {
  removeButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.removeClusterSettingsFlyout.removeButtonLabel',
    {
      defaultMessage: 'Remove deprecated settings',
    }
  ),
  retryRemoveButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.removeClusterSettingsFlyout.retryRemoveButtonLabel',
    {
      defaultMessage: 'Retry removing deprecated settings',
    }
  ),
  resolvedButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.removeClusterSettingsFlyout.resolvedButtonLabel',
    {
      defaultMessage: 'Resolved',
    }
  ),
  closeButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.removeClusterSettingsFlyout.closeButtonLabel',
    {
      defaultMessage: 'Close',
    }
  ),
  getConfirmationText: (clusterSettingsCount: number) =>
    i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.removeClusterSettingsFlyout.description',
      {
        defaultMessage:
          'Remove the following deprecated cluster {clusterSettingsCount, plural, one {setting} other {settings}}?',
        values: {
          clusterSettingsCount,
        },
      }
    ),
  errorTitle: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.removeClusterSettingsFlyout.deleteErrorTitle',
    {
      defaultMessage: 'Error deleting cluster settings',
    }
  ),
};

export const RemoveClusterSettingsFlyout = ({
  deprecation,
  closeFlyout,
  removeClusterSettings,
  status,
}: RemoveClusterSettingsFlyoutProps) => {
  const { message, details, url, correctiveAction } = deprecation;
  const { statusType, details: statusDetails } = status;

  // Flag used to hide certain parts of the UI if the deprecation has been resolved or is in progress
  const isResolvable = ['idle', 'error'].includes(statusType);

  const onRemoveSettings = useCallback(() => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_CLUSTER_SETTINGS_DELETE_CLICK);
    removeClusterSettings((correctiveAction as ClusterSettingAction).deprecatedSettings);
  }, [correctiveAction, removeClusterSettings]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <DeprecationBadge
          isCritical={deprecation.isCritical}
          isResolved={statusType === 'complete'}
        />
        <EuiSpacer size="s" />
        <EuiTitle size="s" data-test-subj="flyoutTitle">
          <h2 id="removeClusterSettingsDetailsFlyoutTitle">{message}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {statusType === 'error' && (
          <>
            <EuiCallOut
              title={i18nTexts.errorTitle}
              color="danger"
              iconType="alert"
              data-test-subj="deleteClusterSettingsError"
            >
              {statusDetails!.message}
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        <EuiText>
          <p>{details}</p>
          <p>
            <DeprecationFlyoutLearnMoreLink documentationUrl={url} />
          </p>
        </EuiText>

        {isResolvable && (
          <div data-test-subj="removeClusterSettingsPrompt">
            <EuiSpacer />

            <EuiTitle size="xs">
              <h3>
                {i18nTexts.getConfirmationText(
                  (correctiveAction as ClusterSettingAction).deprecatedSettings.length
                )}
              </h3>
            </EuiTitle>

            <EuiSpacer />

            <EuiText>
              <ul>
                {(correctiveAction as ClusterSettingAction).deprecatedSettings.map((setting) => (
                  <li key={setting}>
                    <EuiCode>{setting}</EuiCode>
                  </li>
                ))}
              </ul>
            </EuiText>
          </div>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout} flush="left">
              {i18nTexts.closeButtonLabel}
            </EuiButtonEmpty>
          </EuiFlexItem>

          {isResolvable && (
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                data-test-subj="deleteClusterSettingsButton"
                color="danger"
                onClick={onRemoveSettings}
              >
                {statusType === 'error'
                  ? i18nTexts.retryRemoveButtonLabel
                  : i18nTexts.removeButtonLabel}
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
