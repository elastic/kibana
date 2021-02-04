/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { EuiPopover, EuiButtonEmpty, EuiContextMenuItem, EuiContextMenuPanel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useAlertPrefillContext } from '../../use_alert_prefill';
import { AlertFlyout } from './alert_flyout';
import { ManageAlertsContextMenuItem } from '../../inventory/components/manage_alerts_context_menu_item';

export const MetricsAlertDropdown = () => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [flyoutVisible, setFlyoutVisible] = useState(false);

  const { metricThresholdPrefill } = useAlertPrefillContext();
  const { groupBy, filterQuery, metrics } = metricThresholdPrefill;

  const closePopover = useCallback(() => {
    setPopoverOpen(false);
  }, [setPopoverOpen]);

  const openPopover = useCallback(() => {
    setPopoverOpen(true);
  }, [setPopoverOpen]);

  const menuItems = [
    <EuiContextMenuItem icon="bell" key="createLink" onClick={() => setFlyoutVisible(true)}>
      <FormattedMessage id="xpack.infra.alerting.createAlertButton" defaultMessage="Create alert" />
    </EuiContextMenuItem>,
    <ManageAlertsContextMenuItem />,
  ];

  return (
    <>
      <EuiPopover
        button={
          <EuiButtonEmpty iconSide={'right'} iconType={'arrowDown'} onClick={openPopover}>
            <FormattedMessage id="xpack.infra.alerting.alertsButton" defaultMessage="Alerts" />
          </EuiButtonEmpty>
        }
        isOpen={popoverOpen}
        closePopover={closePopover}
      >
        <EuiContextMenuPanel items={menuItems} />
      </EuiPopover>
      <AlertFlyout
        setVisible={setFlyoutVisible}
        visible={flyoutVisible}
        options={{ groupBy, filterQuery, metrics }}
      />
    </>
  );
};
