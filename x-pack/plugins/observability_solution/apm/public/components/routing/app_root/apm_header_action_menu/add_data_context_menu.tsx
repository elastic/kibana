/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiHeaderLink,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import { ApmOnboardingLocatorParams } from '../../../../locator/onboarding_locator';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useKibana } from '../../../../context/kibana_context/use_kibana';
import { ApmPluginStartDeps, ApmServices } from '../../../../plugin';
import { EntityInventoryAddDataParams } from '../../../../services/telemetry';
import {
  associateServiceLogsProps,
  collectServiceLogsProps,
  addApmDataProps,
} from '../../../shared/add_data_buttons/buttons';

const addData = i18n.translate('xpack.apm.addDataContextMenu.link', {
  defaultMessage: 'Add data',
});

export function AddDataContextMenu() {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { services } = useKibana<ApmPluginStartDeps & ApmServices>();
  const {
    core: {
      http: { basePath },
    },
    share: {
      url: { locators },
    },
  } = useApmPluginContext();

  const onboardingLocator = locators.get<ApmOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );

  const addApmButtonData = addApmDataProps(onboardingLocator);

  const button = (
    <EuiHeaderLink
      color="text"
      iconType="arrowDown"
      iconSide="right"
      onClick={() => setPopoverOpen((prevState) => !prevState)}
      data-test-subj="apmAddDataHeaderContextMenu"
    >
      {addData}
    </EuiHeaderLink>
  );

  function reportButtonClick(journey: EntityInventoryAddDataParams['journey']) {
    services.telemetry.reportEntityInventoryAddData({
      view: 'add_data_button',
      journey,
    });
  }

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      title: addData,
      items: [
        {
          name: associateServiceLogsProps.name,
          href: associateServiceLogsProps.link,
          'data-test-subj': 'apmAddDataAssociateServiceLogs',
          target: '_blank',
          onClick: () => {
            reportButtonClick('associate_existing_service_logs');
          },
        },
        {
          name: collectServiceLogsProps.name,
          href: basePath.prepend(collectServiceLogsProps.link),
          'data-test-subj': 'apmAddDataCollectServiceLogs',
          onClick: () => {
            reportButtonClick('collect_new_service_logs');
          },
        },
        ...(addApmButtonData.link
          ? [
              {
                name: addApmButtonData.name,
                href: addApmButtonData.link,
                icon: 'plusInCircle',
                'data-test-subj': 'apmAddDataApmAgent',
                onClick: () => {
                  reportButtonClick('add_apm_agent');
                },
              },
            ]
          : []),
      ],
    },
  ];

  return (
    <>
      <EuiPopover
        id="integrations-menu"
        button={button}
        isOpen={popoverOpen}
        closePopover={() => setPopoverOpen(false)}
        panelPaddingSize="none"
        anchorPosition="downRight"
      >
        <EuiContextMenu initialPanelId={0} panels={panels} />
      </EuiPopover>
    </>
  );
}
