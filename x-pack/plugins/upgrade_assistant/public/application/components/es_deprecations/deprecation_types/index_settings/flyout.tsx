/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
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
  EuiTextColor,
  EuiLink,
  EuiSpacer,
  EuiCallOut,
} from '@elastic/eui';
import { EnrichedDeprecationInfo, IndexSettingAction } from '../../../../../../common/types';
import type { ResponseError } from '../../../../lib/api';
import type { Status } from '../../../types';

export interface RemoveIndexSettingsFlyoutProps {
  deprecation: EnrichedDeprecationInfo;
  closeFlyout: () => void;
  removeIndexSettings: (index: string, settings: string[]) => Promise<void>;
  status: {
    statusType: Status;
    details?: ResponseError;
  };
}

const i18nTexts = {
  getFlyoutDescription: (indexName: string) =>
    i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.removeSettingsFlyout.secondaryDescription',
      {
        defaultMessage: 'Index: {indexName}',
        values: {
          indexName,
        },
      }
    ),
  learnMoreLinkLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.removeSettingsFlyout.learnMoreLinkLabel',
    {
      defaultMessage: 'Learn more about this deprecation',
    }
  ),
  removeButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.removeSettingsFlyout.removeButtonLabel',
    {
      defaultMessage: 'Remove deprecated settings',
    }
  ),
  retryRemoveButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.removeSettingsFlyout.retryRemoveButtonLabel',
    {
      defaultMessage: 'Retry removing deprecated settings',
    }
  ),
  resolvedButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.removeSettingsFlyout.resolvedButtonLabel',
    {
      defaultMessage: 'Resolved',
    }
  ),
  closeButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.removeSettingsFlyout.closeButtonLabel',
    {
      defaultMessage: 'Close',
    }
  ),
  getConfirmationText: (indexSettingsCount: number) =>
    i18n.translate('xpack.upgradeAssistant.esDeprecations.removeSettingsFlyout.description', {
      defaultMessage:
        'Remove the following deprecated index {indexSettingsCount, plural, one {setting} other {settings}}?',
      values: {
        indexSettingsCount,
      },
    }),
  errorTitle: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.removeSettingsFlyout.deleteErrorTitle',
    {
      defaultMessage: 'Error deleting index settings',
    }
  ),
};

export const RemoveIndexSettingsFlyout = ({
  deprecation,
  closeFlyout,
  removeIndexSettings,
  status,
}: RemoveIndexSettingsFlyoutProps) => {
  const { index, message, details, url, correctiveAction } = deprecation;
  const { statusType, details: statusDetails } = status;

  // Flag used to hide certain parts of the UI if the deprecation has been resolved or is in progress
  const isResolvable = ['idle', 'error'].includes(statusType);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s" data-test-subj="flyoutTitle">
          <h2>{message}</h2>
        </EuiTitle>
        <EuiText>
          <p>
            <EuiTextColor color="subdued">{i18nTexts.getFlyoutDescription(index!)}</EuiTextColor>
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {statusType === 'error' && (
          <>
            <EuiCallOut
              title={i18nTexts.errorTitle}
              color="danger"
              iconType="alert"
              data-test-subj="deleteSettingsError"
            >
              {statusDetails!.message}
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}

        <EuiText>
          <p>{details}</p>
          <p>
            <EuiLink target="_blank" href={url}>
              {i18nTexts.learnMoreLinkLabel}
            </EuiLink>
          </p>
        </EuiText>

        {isResolvable && (
          <div data-test-subj="removeSettingsPrompt">
            <EuiSpacer />

            <EuiTitle size="xs">
              <h3>
                {i18nTexts.getConfirmationText(
                  (correctiveAction as IndexSettingAction).deprecatedSettings.length
                )}
              </h3>
            </EuiTitle>

            <EuiSpacer />

            <EuiText>
              <ul>
                {(correctiveAction as IndexSettingAction).deprecatedSettings.map(
                  (setting, settingIndex) => (
                    <li key={`${setting}-${settingIndex}`}>
                      <EuiCode>{setting}</EuiCode>
                    </li>
                  )
                )}
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
                data-test-subj="deleteSettingsButton"
                color="danger"
                onClick={() =>
                  removeIndexSettings(
                    index!,
                    (correctiveAction as IndexSettingAction).deprecatedSettings
                  )
                }
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
