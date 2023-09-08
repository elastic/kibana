/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSplitPanel,
  EuiSwitch,
  EuiSwitchEvent,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface SettingsPanelProps {
  description: string;
  label: string;
  link?: React.ReactNode;
  onChange: (event: EuiSwitchEvent) => void;
  title: string;
  value: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  description,
  label,
  link,
  onChange,
  title,
  value,
}) => (
  <EuiSplitPanel.Outer hasBorder grow>
    <EuiSplitPanel.Inner>
      <EuiText size="m">
        <h4>
          <strong>{title}</strong>
        </h4>
      </EuiText>
      <EuiSpacer />
      <EuiText size="s">
        <p>{description}</p>
        <p>
          {i18n.translate(
            'xpack.enterpriseSearch.content.settings.contentExtraction.descriptionTwo',
            {
              defaultMessage:
                'You can also enable or disable this feature for a specific index on the index’s configuration page.',
            }
          )}
        </p>
      </EuiText>
    </EuiSplitPanel.Inner>
    <EuiSplitPanel.Inner grow={false} color="subdued">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiSwitch checked={value} label={label} onChange={onChange} />
        </EuiFlexItem>
        {link && <EuiFlexItem grow={false}>{link}</EuiFlexItem>}
      </EuiFlexGroup>
    </EuiSplitPanel.Inner>
  </EuiSplitPanel.Outer>
);
