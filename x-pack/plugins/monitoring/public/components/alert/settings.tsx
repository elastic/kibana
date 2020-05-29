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

import { AlertPopoverConfigureParam } from './configure_param';
import { AlertPopoverContext } from './lib';
import { CommonBaseAlert } from '../../../common/types';
import { AlertPopoverConfigureThrottle } from './configure_throttle';

interface AlertPopoverSettingsProps {
  isEditMode: boolean;
}
export const AlertPopoverSettings: React.FC<AlertPopoverSettingsProps> = (
  props: AlertPopoverSettingsProps
) => {
  const { isEditMode } = props;
  const context = React.useContext(AlertPopoverContext);
  const [activeConfigureSetting, setActiveConfigureSetting] = React.useState<string | null>(null);

  if (!context.alert.rawAlert.params || Object.keys(context.alert.rawAlert.params).length === 0) {
    return null;
  }

  function doneConfiguringSetting(alert: CommonBaseAlert) {
    setActiveConfigureSetting(null);
    context.updateAlert(alert);
  }

  let configureSettingUi = null;
  if (activeConfigureSetting) {
    switch (activeConfigureSetting) {
      case 'throttle':
        configureSettingUi = (
          <AlertPopoverConfigureThrottle
            cancel={() => setActiveConfigureSetting(null)}
            done={doneConfiguringSetting}
          />
        );
        break;
      default:
        configureSettingUi = (
          <AlertPopoverConfigureParam
            name={activeConfigureSetting}
            details={context.alert.paramDetails[activeConfigureSetting]}
            value={context.alert.rawAlert.params[activeConfigureSetting]}
            cancel={() => setActiveConfigureSetting(null)}
            done={doneConfiguringSetting}
          />
        );
    }
  }

  function getDynamicSettings() {
    if (!context.alert.rawAlert.params || Object.keys(context.alert.rawAlert.params).length === 0) {
      return null;
    }

    return Object.keys(context.alert.rawAlert.params).map((name) => {
      const detail = context.alert.paramDetails[name];
      if (!detail) {
        return null;
      }
      return (
        <EuiFlexGroup alignItems="center" gutterSize="s" key={name}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="clock" size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <p>{detail.withValueLabel}</p>
            </EuiText>
          </EuiFlexItem>
          {isEditMode ? (
            <EuiFlexItem>
              <EuiLink onClick={() => setActiveConfigureSetting(name)}>
                <EuiText size="s">Configure</EuiText>
              </EuiLink>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      );
    });
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
              {isEditMode ? (
                <EuiFlexItem>
                  <EuiLink onClick={() => setActiveConfigureSetting('throttle')}>
                    <EuiText size="s">Configure</EuiText>
                  </EuiLink>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
            {getDynamicSettings()}
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
