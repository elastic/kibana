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
} from '@elastic/eui';
import { EnrichedDeprecationInfo, IndexSettingAction } from '../../../../../../common/types';

export interface RemoveIndexSettingsFlyoutProps {
  deprecation: EnrichedDeprecationInfo;
  closeFlyout: () => void;
  removeIndexSettings: (index: string, settings: string[]) => Promise<void>;
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
  closeButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.removeSettingsFlyout.cancelButtonLabel',
    {
      defaultMessage: 'Close',
    }
  ),
  confirmationText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.removeSettingsFlyout.description',
    {
      defaultMessage: 'Remove the following deprecated index settings?',
    }
  ),
};

export const RemoveIndexSettingsFlyout = ({
  deprecation,
  closeFlyout,
  removeIndexSettings,
}: RemoveIndexSettingsFlyoutProps) => {
  const { index, message, details, url, correctiveAction } = deprecation;

  // TODO handle error banner/retry if error
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>{message}</h2>
        </EuiTitle>
        <EuiText>
          <p>
            <EuiTextColor color="subdued">{i18nTexts.getFlyoutDescription(index!)}</EuiTextColor>
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <p>{details}</p>
          <p>
            <EuiLink target="_blank" href={url}>
              {i18nTexts.learnMoreLinkLabel}
            </EuiLink>
          </p>
        </EuiText>

        <EuiSpacer />

        <EuiTitle size="xs">
          <h3>{i18nTexts.confirmationText}</h3>
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
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout} flush="left">
              {i18nTexts.closeButtonLabel}
            </EuiButtonEmpty>
          </EuiFlexItem>
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
              {i18nTexts.removeButtonLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
