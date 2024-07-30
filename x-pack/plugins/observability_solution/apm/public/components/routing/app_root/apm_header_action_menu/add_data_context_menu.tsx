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
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useServiceEcoTour } from '../../../../hooks/use_eco_tour';
import { useKibana } from '../../../../context/kibana_context/use_kibana';
import { ApmPluginStartDeps, ApmServices } from '../../../../plugin';
import { EntityInventoryAddDataParams } from '../../../../services/telemetry';
import {
  associateServiceLogs,
  collectServiceLogs,
  addApmData,
} from '../../../shared/add_data_buttons/buttons';
import { ServiceEcoTour } from '../../../shared/entity_enablement/service_eco_tour';

const addData = i18n.translate('xpack.apm.addDataContextMenu.link', {
  defaultMessage: 'Add data',
});

export function AddDataContextMenu() {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { tourState, hideTour } = useServiceEcoTour();
  const { services } = useKibana<ApmPluginStartDeps & ApmServices>();
  const {
    core: {
      http: { basePath },
    },
  } = useApmPluginContext();

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
          name: associateServiceLogs.name,
          href: associateServiceLogs.link,
          'data-test-subj': 'apmAddDataAssociateServiceLogs',
          target: '_blank',
          onClick: () => {
            reportButtonClick('associate_existing_service_logs');
          },
        },
        {
          name: collectServiceLogs.name,
          href: basePath.prepend(collectServiceLogs.link),
          'data-test-subj': 'apmAddDataCollectServiceLogs',
          onClick: () => {
            reportButtonClick('collect_new_service_logs');
          },
        },
        {
          name: addApmData.name,
          href: basePath.prepend(addApmData.link),
          icon: 'plusInCircle',
          'data-test-subj': 'apmAddDataApmAgent',
          onClick: () => {
            reportButtonClick('add_apm_agent');
          },
        },
      ],
    },
  ];

  const handleTourClose = () => {
    hideTour();
    setPopoverOpen(false);
  };
  return (
    <>
      <EuiPopover
        id="integrations-menu"
        button={button}
        isOpen={popoverOpen || tourState.isTourActive}
        closePopover={() => setPopoverOpen(false)}
        panelPaddingSize="none"
        anchorPosition="downRight"
      >
        <ServiceEcoTour onFinish={handleTourClose}>
          <EuiContextMenu initialPanelId={0} panels={panels} />
        </ServiceEcoTour>
      </EuiPopover>
    </>
  );
}
