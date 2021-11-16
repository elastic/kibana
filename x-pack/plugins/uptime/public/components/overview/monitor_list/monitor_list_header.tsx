/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import styled from 'styled-components';
import { StatusFilter } from './status_filter';
import { MonitorConfigFlyout } from './actions/monitor_config_flyout';
import { SyntheticsCreateProviders } from '../../fleet_package/contexts';

const FlexGroupContainer = styled(EuiFlexGroup)`
  position: relative;
`;

export const MonitorListHeader: React.FC = () => {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const showFlyout = () => setIsFlyoutVisible(true);

  return (
    <>
      <FlexGroupContainer alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.uptime.monitorList.monitoringStatusTitle"
                defaultMessage="Monitors"
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <StatusFilter />
        </EuiFlexItem>
        <EuiFlexItem grow={true} style={{ alignItems: 'flex-end' }}>
          <EuiButton iconType="plus" fullWidth={false} onClick={showFlyout} style={{ width: 150 }}>
            Add monitor
          </EuiButton>
        </EuiFlexItem>
      </FlexGroupContainer>
      {isFlyoutVisible && (
        <SyntheticsCreateProviders>
          <MonitorConfigFlyout setIsFlyoutVisible={setIsFlyoutVisible} />
        </SyntheticsCreateProviders>
      )}
    </>
  );
};
