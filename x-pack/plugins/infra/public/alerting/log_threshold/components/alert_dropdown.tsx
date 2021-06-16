/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPopover, EuiButtonEmpty, EuiContextMenuItem, EuiContextMenuPanel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { AlertFlyout } from './alert_flyout';
import { useLinkProps } from '../../../hooks/use_link_props';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

const readOnlyUserTooltipContent = i18n.translate(
  'xpack.infra.logs.alertDropdown.readOnlyCreateAlertContent',
  {
    defaultMessage: 'Creating alerts requires more permissions in this application.',
  }
);

const readOnlyUserTooltipTitle = i18n.translate(
  'xpack.infra.logs.alertDropdown.readOnlyCreateAlertTitle',
  {
    defaultMessage: 'Read only',
  }
);

export const AlertDropdown = () => {
  const {
    services: {
      application: { capabilities },
    },
  } = useKibanaContextForPlugin();
  const canCreateAlerts = capabilities?.logs?.save ?? false;
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [flyoutVisible, setFlyoutVisible] = useState(false);
  const manageAlertsLinkProps = useLinkProps(
    {
      app: 'management',
      pathname: '/insightsAndAlerting/triggersActions/alerts',
    },
    {
      hrefOnly: true,
    }
  );

  const closePopover = useCallback(() => {
    setPopoverOpen(false);
  }, [setPopoverOpen]);

  const openPopover = useCallback(() => {
    setPopoverOpen(true);
  }, [setPopoverOpen]);

  const menuItems = useMemo(() => {
    return [
      <EuiContextMenuItem
        disabled={!canCreateAlerts}
        icon="bell"
        key="createLink"
        onClick={() => setFlyoutVisible(true)}
        toolTipContent={!canCreateAlerts ? readOnlyUserTooltipContent : undefined}
        toolTipTitle={!canCreateAlerts ? readOnlyUserTooltipTitle : undefined}
      >
        <FormattedMessage
          id="xpack.infra.alerting.logs.createAlertButton"
          defaultMessage="Create alert"
        />
      </EuiContextMenuItem>,
      <EuiContextMenuItem icon="tableOfContents" key="manageLink" {...manageAlertsLinkProps}>
        <FormattedMessage
          id="xpack.infra.alerting.logs.manageAlerts"
          defaultMessage="Manage alerts"
        />
      </EuiContextMenuItem>,
    ];
  }, [manageAlertsLinkProps, canCreateAlerts]);

  return (
    <>
      <EuiPopover
        panelPaddingSize="none"
        button={
          <EuiButtonEmpty
            size="xs"
            color="text"
            iconSide={'right'}
            iconType={'arrowDown'}
            onClick={openPopover}
          >
            <FormattedMessage id="xpack.infra.alerting.logs.alertsButton" defaultMessage="Alerts" />
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
