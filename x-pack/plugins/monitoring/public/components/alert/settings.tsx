/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import {
  EuiSpacer,
  EuiFlexItem,
  EuiFlexGroup,
  EuiIcon,
  EuiText,
  EuiLink,
  EuiListGroup,
  EuiListGroupItem,
} from '@elastic/eui';

import { AlertPopoverConfigureThrottle } from './configure_throttle';
import { AlertPopoverContext } from './lib';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface AlertPopoverSettingsProps {}
export const AlertPopoverSettings: React.FC<AlertPopoverSettingsProps> = (
  props: AlertPopoverSettingsProps
) => {
  const context = React.useContext(AlertPopoverContext);
  const [activeConfigureSetting, setActiveConfigureSetting] = React.useState<string | null>(null);

  let configureSettingUi = null;
  switch (activeConfigureSetting) {
    case 'throttle':
      configureSettingUi = (
        <AlertPopoverConfigureThrottle
          cancel={() => setActiveConfigureSetting(null)}
          done={alert => {
            setActiveConfigureSetting(null);
            context.updateThrottle(alert.rawAlert.throttle);
          }}
        />
      );
      break;
  }

  const settingsList = (
    <Fragment>
      <EuiListGroupItem
        label={
          <Fragment>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIcon type="clock" size="s" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <p>Notify me every {context.alert.rawAlert.throttle}</p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiLink onClick={() => setActiveConfigureSetting('throttle')}>
                  <EuiText size="s">Configure</EuiText>
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
            {activeConfigureSetting ? (
              <Fragment>
                <EuiSpacer size="s" />
                {configureSettingUi}
              </Fragment>
            ) : null}
          </Fragment>
        }
      />
    </Fragment>
  );

  return (
    <EuiListGroup gutterSize="none" size="xs">
      {settingsList}
    </EuiListGroup>
  );
};
