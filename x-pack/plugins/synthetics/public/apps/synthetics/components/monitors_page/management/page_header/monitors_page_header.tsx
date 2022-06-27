/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiBetaBadge, EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { useEnablement } from '../../../../hooks';
import { MONITOR_ADD_ROUTE } from '../../../../../../../common/constants';

import { SyntheticsSettingsContext } from '../../../../contexts/synthetics_settings_context';

import { BETA_TOOLTIP_MESSAGE } from '../labels';

export const MonitorsPageHeader = () => {
  const { basePath } = useContext(SyntheticsSettingsContext);

  const {
    enablement: { isEnabled },
  } = useEnablement();

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <FormattedMessage
          id="xpack.synthetics.monitors.pageHeader.title"
          defaultMessage="Monitors"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <div>
          <EuiBetaBadge label="Beta" tooltipContent={BETA_TOOLTIP_MESSAGE} />
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          color="primary"
          fill
          iconSide="left"
          iconType="plusInCircleFilled"
          href={`${basePath}/app/uptime${MONITOR_ADD_ROUTE}`}
          isDisabled={!isEnabled}
          data-test-subj="syntheticsAddMonitorBtn"
        >
          <FormattedMessage
            id="xpack.synthetics.monitors.pageHeader.createButton.label"
            defaultMessage="Create Monitor"
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
