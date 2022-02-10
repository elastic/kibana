/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSwitch, EuiSpacer, EuiText, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';

interface Props {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}

export const KeepPoliciesUpToDateSwitch: React.FunctionComponent<Props> = ({
  checked,
  disabled = false,
  onChange,
}) => (
  <>
    <EuiSwitch
      label={i18n.translate(
        'xpack.fleet.integrations.settings.keepIntegrationPoliciesUpToDateLabel',
        { defaultMessage: 'Keep integration policies up to date automatically' }
      )}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
    />
    <EuiSpacer size="s" />
    <EuiText color="subdued" size="xs">
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiIcon type="iInCircle" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {disabled ? (
            <FormattedMessage
              id="xpack.fleet.integrations.settings.keepIntegrationPoliciesUpToDateDisabledDescription"
              defaultMessage="This integration requires Fleet to automatically upgrade its integration policies"
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.integrations.settings.keepIntegrationPoliciesUpToDateDescription"
              defaultMessage="When enabled, Fleet will attempt to upgrade and deploy integration policies automatically"
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiText>
  </>
);
