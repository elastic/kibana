/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { EuiCode, EuiSpacer } from '@elastic/eui';

import { WarningCheckbox } from './checkbox';
import { CheckboxProps } from './types';

const i18nTexts = {
  checkboxLabel: i18n.translate(
    'xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.deprecatedSettingsWarningTitle',
    { defaultMessage: 'Remove deprecated index settings' }
  ),
  checkboxDescription: i18n.translate(
    'xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.deprecatedSettingsWarningDescription',
    { defaultMessage: 'The following deprecated index settings were detected:' }
  ),
};

export const DeprecatedSettingsWarningCheckbox: React.FunctionComponent<CheckboxProps> = ({
  isChecked,
  onChange,
  docLinks,
  id,
  meta,
}) => {
  return (
    <WarningCheckbox
      isChecked={isChecked}
      onChange={onChange}
      warningId={id}
      label={i18nTexts.checkboxLabel}
      description={
        <>
          {i18nTexts.checkboxDescription}

          <EuiSpacer size="xs" />

          <ul>
            {(meta!.deprecatedSettings as string[]).map((setting, index) => {
              return (
                <li key={`${setting}-${index}`}>
                  <EuiCode>{setting}</EuiCode>
                </li>
              );
            })}
          </ul>
        </>
      }
      documentationUrl={docLinks.elasticsearch.indexModules}
    />
  );
};
