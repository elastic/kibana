/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeaderLink,
  EuiIcon,
  EuiPopover,
} from '@elastic/eui';
import {
  OBSERVABILITY_ONBOARDING_LOCATOR,
  ObservabilityOnboardingLocatorParams,
} from '@kbn/deeplinks-observability';
import { useKibana } from '../../../hooks/use_kibana';
import type { InventoryAddDataParams } from '../../../services/telemetry/types';
import {
  ASSOCIATE_LOGS_LINK,
  addDataItem,
  addDataTitle,
  associateServiceLogsItem,
} from '../../shared/add_data_buttons/buttons';

export function AddDataContextMenu() {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const {
    services: { share, telemetry },
  } = useKibana();

  const onboardingLocator = share.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );

  const button = (
    <EuiHeaderLink
      color="primary"
      iconType="indexOpen"
      onClick={() => setPopoverOpen((prevState) => !prevState)}
      data-test-subj="inventoryAddDataHeaderContextMenu"
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>{addDataTitle}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type="arrowDown" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiHeaderLink>
  );

  function reportButtonClick(journey: InventoryAddDataParams['journey']) {
    telemetry.reportInventoryAddData({
      view: 'add_data_button',
      journey,
    });
  }

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      title: addDataTitle,
      items: [
        {
          name: (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>{associateServiceLogsItem}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIcon type="popout" />
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
          key: 'associateServiceLogs',
          href: ASSOCIATE_LOGS_LINK,
          'data-test-subj': 'inventoryHeaderMenuAddDataAssociateServiceLogs',
          target: '_blank',
          onClick: () => {
            reportButtonClick('associate_existing_service_logs');
          },
        },
        {
          name: addDataItem,
          key: 'addData',
          href: onboardingLocator?.getRedirectUrl({ category: '' }),
          icon: 'plusInCircle',
          'data-test-subj': 'inventoryHeaderMenuAddData',
          onClick: () => {
            reportButtonClick('add_data');
          },
        },
      ],
    },
  ];

  return (
    <EuiPopover
      id="inventoryHeaderMenuAddDataPopover"
      button={button}
      isOpen={popoverOpen}
      closePopover={() => setPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downCenter"
    >
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
}
