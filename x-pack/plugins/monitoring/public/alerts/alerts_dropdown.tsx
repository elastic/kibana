/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { Legacy } from '../legacy_shims';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { MonitoringStartPluginDependencies } from '../types';

export const AlertsDropdown: React.FC<{}> = () => {
  const $injector = Legacy.shims.getAngularInjector();
  const alertsEnableModalProvider: any = $injector.get('enableAlertsModal');
  const { navigateToApp } = useKibana<
    MonitoringStartPluginDependencies['core']
  >().services.application;

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const togglePopoverVisibility = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const createDefaultRules = () => {
    alertsEnableModalProvider.enableAlerts();
    closePopover();
  };

  const button = (
    <EuiButtonEmpty iconSide={'right'} iconType={'arrowDown'} onClick={togglePopoverVisibility}>
      <FormattedMessage
        id="xpack.monitoring.alerts.dropdown.button"
        defaultMessage="Alerts and rules"
      />
    </EuiButtonEmpty>
  );

  const items: EuiContextMenuPanelDescriptor['items'] = [
    {
      name: i18n.translate('xpack.monitoring.alerts.dropdown.createAlerts', {
        defaultMessage: 'Create default rules',
      }),
      onClick: createDefaultRules,
    },
    {
      name: i18n.translate('xpack.monitoring.alerts.dropdown.manageRules', {
        defaultMessage: 'Manage rules',
      }),
      icon: 'tableOfContents',
      onClick: () =>
        navigateToApp('management', { path: '/insightsAndAlerting/triggersActions/rules' }),
    },
  ];

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      title: i18n.translate('xpack.monitoring.alerts.dropdown.title', {
        defaultMessage: 'Alerts and rules',
      }),
      items,
    },
  ];

  return (
    <EuiPopover
      panelPaddingSize="none"
      anchorPosition="downLeft"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
