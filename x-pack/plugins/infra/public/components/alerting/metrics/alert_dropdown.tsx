/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { EuiPopover, EuiButtonEmpty, EuiContextMenuItem, EuiContextMenuPanel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { AlertFlyout } from './alert_flyout';
import { useLinkProps } from '../../../hooks/use_link_props';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

export const AlertDropdown = () => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [flyoutVisible, setFlyoutVisible] = useState(false);
  const kibana = useKibana();

  const closePopover = useCallback(() => {
    setPopoverOpen(false);
  }, [setPopoverOpen]);

  const openPopover = useCallback(() => {
    setPopoverOpen(true);
  }, [setPopoverOpen]);

  const menuItems = useMemo(() => {
    return [
      <EuiContextMenuItem icon="bell" key="createLink" onClick={() => setFlyoutVisible(true)}>
        <FormattedMessage
          id="xpack.infra.metricsExplorer.createAlertButton"
          defaultMessage="Create alert"
        />
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        icon="tableOfContents"
        key="manageLink"
        href={kibana.services?.application?.getUrlForApp(
          'kibana#/management/kibana/triggersActions/alerts'
        )}
      >
        <FormattedMessage
          id="xpack.infra.logEntryActionsMenu.manageAlerts"
          defaultMessage="Manage Alerts"
        />
      </EuiContextMenuItem>,
    ];
  }, [kibana.services]);

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
      <AlertFlyout setVisible={setFlyoutVisible} visible={flyoutVisible} />
    </>
  );
};
