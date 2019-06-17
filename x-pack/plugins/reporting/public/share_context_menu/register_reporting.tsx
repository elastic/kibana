/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { I18nServiceType } from '@kbn/i18n/angular';
import moment from 'moment-timezone';
// @ts-ignore: implicit any for JS file
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';
import React from 'react';
import chrome from 'ui/chrome';
import { ShareActionProps } from 'ui/share/share_action';
import { ShareContextMenuExtensionsRegistryProvider } from 'ui/share/share_action_registry';
import { unhashUrl } from 'ui/state_management/state_hashing';
import { ScreenCapturePanelContent } from '../components/screen_capture_panel_content';

function reportingProvider(Private: any, dashboardConfig: any, i18n: I18nServiceType) {
  const xpackInfo = Private(XPackInfoProvider);
  const getShareActions = ({
    objectType,
    objectId,
    getUnhashableStates,
    sharingData,
    isDirty,
    onClose,
  }: ShareActionProps) => {
    if (!['dashboard', 'visualization'].includes(objectType)) {
      return [];
    }
    // Dashboard only mode does not currently support reporting
    // https://github.com/elastic/kibana/issues/18286
    if (objectType === 'dashboard' && dashboardConfig.getHideWriteControls()) {
      return [];
    }

    const getReportingJobParams = () => {
      // Replace hashes with original RISON values.
      const unhashedUrl = unhashUrl(window.location.href, getUnhashableStates());
      const relativeUrl = unhashedUrl.replace(window.location.origin + chrome.getBasePath(), '');

      const browserTimezone =
        chrome.getUiSettingsClient().get('dateFormat:tz') === 'Browser'
          ? moment.tz.guess()
          : chrome.getUiSettingsClient().get('dateFormat:tz');

      return {
        ...sharingData,
        objectType,
        browserTimezone,
        relativeUrls: [relativeUrl],
      };
    };

    const getPngJobParams = () => {
      // Replace hashes with original RISON values.
      const unhashedUrl = unhashUrl(window.location.href, getUnhashableStates());
      const relativeUrl = unhashedUrl.replace(window.location.origin + chrome.getBasePath(), '');

      const browserTimezone =
        chrome.getUiSettingsClient().get('dateFormat:tz') === 'Browser'
          ? moment.tz.guess()
          : chrome.getUiSettingsClient().get('dateFormat:tz');

      return {
        ...sharingData,
        objectType,
        browserTimezone,
        relativeUrl,
      };
    };

    const shareActions = [];
    if (xpackInfo.get('features.reporting.printablePdf.showLinks', false)) {
      const panelTitle = i18n('xpack.reporting.shareContextMenu.pdfReportsButtonLabel', {
        defaultMessage: 'PDF Reports',
      });

      shareActions.push({
        shareMenuItem: {
          name: panelTitle,
          icon: 'document',
          toolTipContent: xpackInfo.get('features.reporting.printablePdf.message'),
          disabled: !xpackInfo.get('features.reporting.printablePdf.enableLinks', false)
            ? true
            : false,
          ['data-test-subj']: 'pdfReportMenuItem',
          sortOrder: 10,
        },
        panel: {
          title: panelTitle,
          content: (
            <ScreenCapturePanelContent
              reportType="printablePdf"
              objectType={objectType}
              objectId={objectId}
              getJobParams={getReportingJobParams}
              isDirty={isDirty}
              onClose={onClose}
            />
          ),
        },
      });
    }

    if (xpackInfo.get('features.reporting.png.showLinks', false)) {
      const panelTitle = 'PNG Reports';

      shareActions.push({
        shareMenuItem: {
          name: panelTitle,
          icon: 'document',
          toolTipContent: xpackInfo.get('features.reporting.png.message'),
          disabled: !xpackInfo.get('features.reporting.png.enableLinks', false) ? true : false,
          ['data-test-subj']: 'pngReportMenuItem',
          sortOrder: 10,
        },
        panel: {
          title: panelTitle,
          content: (
            <ScreenCapturePanelContent
              reportType="png"
              objectType={objectType}
              objectId={objectId}
              getJobParams={getPngJobParams}
              isDirty={isDirty}
              onClose={onClose}
            />
          ),
        },
      });
    }

    return shareActions;
  };

  return {
    id: 'screenCaptureReports',
    getShareActions,
  };
}

ShareContextMenuExtensionsRegistryProvider.register(reportingProvider);
