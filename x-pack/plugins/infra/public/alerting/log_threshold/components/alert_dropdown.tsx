/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPopover, EuiContextMenuItem, EuiContextMenuPanel, EuiHeaderLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { AlertFlyout } from './alert_flyout';
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
      observability,
    },
  } = useKibanaContextForPlugin();
  const canCreateAlerts = capabilities?.logs?.save ?? false;
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [flyoutVisible, setFlyoutVisible] = useState(false);

  const manageRulesLinkProps = observability.useRulesLink({
    hrefOnly: true,
  });

  const closePopover = useCallback(() => {
    setPopoverOpen(false);
  }, [setPopoverOpen]);

  const openPopover = useCallback(() => {
    setPopoverOpen(true);
  }, [setPopoverOpen]);

  const openFlyout = useCallback(() => {
    setFlyoutVisible(true);
    closePopover();
  }, [setFlyoutVisible, closePopover]);

  const menuItems = useMemo(() => {
    return [
      <EuiContextMenuItem
        disabled={!canCreateAlerts}
        icon="bell"
        key="createLink"
        onClick={openFlyout}
        toolTipContent={!canCreateAlerts ? readOnlyUserTooltipContent : undefined}
        toolTipTitle={!canCreateAlerts ? readOnlyUserTooltipTitle : undefined}
      >
        <FormattedMessage
          id="xpack.infra.alerting.logs.createAlertButton"
          defaultMessage="Create rule"
        />
      </EuiContextMenuItem>,
      <EuiContextMenuItem icon="tableOfContents" key="manageLink" {...manageRulesLinkProps}>
        <FormattedMessage
          id="xpack.infra.alerting.logs.manageAlerts"
          defaultMessage="Manage rules"
        />
      </EuiContextMenuItem>,
    ];
  }, [manageRulesLinkProps, canCreateAlerts, openFlyout]);

  return (
    <>
      <EuiPopover
        panelPaddingSize="none"
        button={
          <EuiHeaderLink
            color="text"
            iconSide={'right'}
            iconType={'arrowDown'}
            onClick={openPopover}
          >
            <FormattedMessage
              id="xpack.infra.alerting.logs.alertsButton"
              defaultMessage="Alerts and rules"
            />
          </EuiHeaderLink>
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
