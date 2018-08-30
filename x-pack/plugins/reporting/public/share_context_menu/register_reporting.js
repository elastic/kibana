/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';
import { ShareContextMenuExtensionsRegistryProvider } from 'ui/registry/share_context_menu_extensions';
import { ReportingPanelContent } from '../components/reporting_panel_content';

function reportingProvider(Private, dashboardConfig) {
  const xpackInfo = Private(XPackInfoProvider);
  const getMenuItems = ({ objectType, objectId, getUnhashableStates, title }) => {
    if (!['dashboard', 'visualization'].includes(objectType)) {
      return [];
    }
    // Dashboard only mode does not currently support reporting
    // https://github.com/elastic/kibana/issues/18286
    if (objectType === 'dashboard' && dashboardConfig.getHideWriteControls()) {
      return [];
    }

    const menuItems = [];
    if (xpackInfo.get('features.reporting.printablePdf.showLinks', false)) {
      const panelTitle = 'PDF Reports';
      menuItems.push({
        shareMenuItem: {
          name: panelTitle,
          icon: 'document',
          toolTipContent: xpackInfo.get('features.reporting.printablePdf.message'),
          disabled: !xpackInfo.get('features.reporting.printablePdf.enableLinks', false) ? true : false,
          ['data-test-subj']: 'pedReportMenuItem',
        },
        panel: {
          title: panelTitle,
          content: (
            <ReportingPanelContent
              reportType="PDF"
              objectType={objectType}
              objectId={objectId}
              getUnhashableStates={getUnhashableStates}
              title={title}
            />
          )
        }
      });
    }

    // TODO add PNG menu item once PNG reporting is supported

    return menuItems;
  };

  return {
    id: 'reporting',
    getMenuItems,
  };
}

ShareContextMenuExtensionsRegistryProvider.register(reportingProvider);
