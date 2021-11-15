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
import { AddMonitorModal } from './actions/add_monitor_modal';

const FlexGroupContainer = styled(EuiFlexGroup)`
  position: relative;
`;

export const MonitorListHeader: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const showModal = () => setIsModalVisible(true);

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
          <EuiButton iconType="plus" fullWidth={false} onClick={showModal} style={{ width: 150 }}>
            Add monitor
          </EuiButton>
        </EuiFlexItem>
      </FlexGroupContainer>
      {isModalVisible && (
        <AddMonitorModal isModalVisible={isModalVisible} setIsModalVisible={setIsModalVisible} />
      )}
    </>
  );
};
