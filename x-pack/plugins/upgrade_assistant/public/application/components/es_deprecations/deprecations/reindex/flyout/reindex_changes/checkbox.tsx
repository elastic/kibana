/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiCheckbox,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
} from '@elastic/eui';

const i18nTexts = {
  tooltipLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.reindexing.warningCheckboxes.tooltipLabel',
    { defaultMessage: 'Documentation' }
  ),
};

export const WarningCheckbox: React.FunctionComponent<{
  isChecked: boolean;
  warningId: string;
  label: React.ReactNode;
  description: React.ReactNode;
  documentationUrl: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ isChecked, warningId, label, onChange, description, documentationUrl }) => (
  <>
    <EuiText>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiCheckbox
            id={warningId}
            label={<strong>{label}</strong>}
            checked={isChecked}
            onChange={onChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiLink href={documentationUrl} target="_blank" external={false}>
            <EuiIconTip content={i18nTexts.tooltipLabel} position="right" type="help" />
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xs" />

      {description}
    </EuiText>

    <EuiSpacer />
  </>
);
