/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { EuiPopover, EuiButtonEmpty, EuiContextMenuItem, EuiContextMenuPanel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useAlertPrefillContext } from '../../../alerting/use_alert_prefill';
import { AlertFlyout } from './alert_flyout';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

export const InventoryAlertDropdown = () => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [flyoutVisible, setFlyoutVisible] = useState(false);
  const kibana = useKibana();

  const { inventoryPrefill } = useAlertPrefillContext();
  const { nodeType, metric, filterQuery } = inventoryPrefill;

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
          id="xpack.infra.alerting.createAlertButton"
          defaultMessage="Create alert"
        />
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        icon="tableOfContents"
        key="manageLink"
        href={kibana.services?.application?.getUrlForApp(
          'management/insightsAndAlerting/triggersActions/alerts'
        )}
      >
        <FormattedMessage id="xpack.infra.alerting.manageAlerts" defaultMessage="Manage alerts" />
      </EuiContextMenuItem>,
    ];
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
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
      <AlertFlyout
        setVisible={setFlyoutVisible}
        visible={flyoutVisible}
        nodeType={nodeType}
        options={{ metric }}
        filter={filterQuery}
      />
    </>
  );
};
