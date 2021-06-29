/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiEmptyPrompt,
  EuiFlexItem,
  EuiSpacer,
  EuiPanel,
  EuiTitle,
  EuiButton,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { useContext } from 'react';
import { UptimeSettingsContext } from '../../../contexts';
import { DynamicSettings } from '../../../../common/runtime_types';

interface DataMissingProps {
  headingMessage: JSX.Element;
  settings?: DynamicSettings;
}

export const DataOrIndexMissing = ({ headingMessage, settings }: DataMissingProps) => {
  const { basePath } = useContext(UptimeSettingsContext);
  return (
    <EuiFlexGroup justifyContent="center" data-test-subj="data-missing">
      <EuiFlexItem grow={false} style={{ flexBasis: 700 }}>
        <EuiSpacer size="m" />
        <EuiPanel>
          <EuiEmptyPrompt
            iconType="logoUptime"
            title={
              <EuiTitle size="l">
                <h3>{headingMessage}</h3>
              </EuiTitle>
            }
            body={
              <>
                <p>
                  <FormattedMessage
                    id="xpack.uptime.emptyState.configureHeartbeatToGetStartedMessage"
                    defaultMessage="Set up Heartbeat to start monitoring your services."
                  />
                </p>
                <p>
                  <FormattedMessage
                    id="xpack.uptime.emptyState.configureHeartbeatIndexSettings"
                    defaultMessage="If Heartbeat is already set up, confirm it's sending data to Elasticsearch,
                    then update the index pattern settings to match the Heartbeat config."
                  />
                </p>
              </>
            }
            actions={
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiButton
                    fill
                    color="primary"
                    href={`${basePath}/app/home#/tutorial/uptimeMonitors`}
                  >
                    <FormattedMessage
                      id="xpack.uptime.emptyState.viewSetupInstructions"
                      defaultMessage="View setup instructions"
                    />
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButton color="primary" href={`${basePath}/app/uptime/settings`}>
                    <FormattedMessage
                      id="xpack.uptime.emptyState.updateIndexPattern"
                      defaultMessage="Update index pattern settings"
                    />
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
