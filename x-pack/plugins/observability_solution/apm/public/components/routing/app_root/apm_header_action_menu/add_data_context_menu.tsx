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
import {
  associateServiceLogs,
  collectServiceLogs,
  addApmAgent,
} from '../../../shared/add_data_buttons/buttons';

const addData = i18n.translate('xpack.apm.addDataContextMenu.link', {
  defaultMessage: 'Add data',
});

export function AddDataContextMenu() {
  const [popoverOpen, setPopoverOpen] = useState(false);
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

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 0,
      title: addData,
      items: [
        {
          name: associateServiceLogs.name,
          href: associateServiceLogs.link,
          'data-test-subj': 'apmAddDataAssociateServiceLogs',
        },
        {
          name: collectServiceLogs.name,
          href: basePath.prepend(collectServiceLogs.link),
          'data-test-subj': 'apmAddDataCollectServiceLogs',
        },
        {
          name: addApmAgent.name,
          href: basePath.prepend(addApmAgent.link),
          icon: 'plusInCircle',
          'data-test-subj': 'apmAddDataApmAgent',
        },
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
