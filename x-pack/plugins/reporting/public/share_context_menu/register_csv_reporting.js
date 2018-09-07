/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';
import { ShareContextMenuExtensionsRegistryProvider } from 'ui/share/share_action_registry';
import { ReportingPanelContent } from '../components/reporting_panel_content';

function reportingProvider(Private) {
  const xpackInfo = Private(XPackInfoProvider);
  const getShareActions = ({ objectType, objectId, sharingData, isDirty, onClose }) => {
    if ('search' !== objectType) {
      return [];
    }

    const getJobParams = () => {
      return {
        ...sharingData,
        type: objectType,
      };
    };

    const shareActions = [];
    if (xpackInfo.get('features.reporting.csv.showLinks', false)) {
      const panelTitle = 'CSV Reports';

      shareActions.push({
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
              onClose={onClose}
            />
          )
        }
      });
    }

    return shareActions;
  };

  return {
    id: 'csvReports',
    getShareActions,
  };
}

ShareContextMenuExtensionsRegistryProvider.register(reportingProvider);
