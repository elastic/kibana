/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';
import { ShareContextMenuExtensionsRegistryProvider } from 'ui/registry/share_context_menu_extensions';
import { ReportingPanelContent } from '../components/reporting_panel_content';

function reportingProvider(Private) {
  const xpackInfo = Private(XPackInfoProvider);
  const getMenuItems = ({ objectType, objectId, sharingData, isDirty }) => {
    if ('search' !== objectType) {
      return [];
    }

    const getJobParams = () => {
      return {
        ...sharingData,
        type: objectType,
      };
    };

    const menuItems = [];
    if (xpackInfo.get('features.reporting.csv.showLinks', false)) {
      const panelTitle = 'CSV Reports';

      menuItems.push({
        shareMenuItem: {
          name: panelTitle,
          icon: 'document',
          toolTipContent: xpackInfo.get('features.reporting.csv.message'),
          disabled: !xpackInfo.get('features.reporting.csv.enableLinks', false) ? true : false,
          ['data-test-subj']: 'csvReportMenuItem',
        },
        panel: {
          title: panelTitle,
          content: (
            <ReportingPanelContent
              reportType="csv"
              objectType={objectType}
              objectId={objectId}
              getJobParams={getJobParams}
              isDirty={isDirty}
            />
          )
        }
      });
    }

    return menuItems;
  };

  return {
    id: 'csvReports',
    getMenuItems,
  };
}

ShareContextMenuExtensionsRegistryProvider.register(reportingProvider);
