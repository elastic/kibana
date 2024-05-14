/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesPublicSetup } from '@kbn/cases-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { PLUGIN_ICON } from '../../common/constants/app';
import { CASE_ATTACHMENT_TYPE_ID_SINGLE_METRIC_VIEWER } from '../../common/constants/cases';
import type { MlStartDependencies } from '../plugin';

export function registerSingleMetricViewerCasesAttachment(
  cases: CasesPublicSetup,
  pluginStart: MlStartDependencies
) {
  cases.attachmentFramework.registerPersistableState({
    id: CASE_ATTACHMENT_TYPE_ID_SINGLE_METRIC_VIEWER,
    icon: PLUGIN_ICON,
    displayName: i18n.translate('xpack.ml.cases.singleMetricViewer.displayName', {
      defaultMessage: 'Single metric viewer',
    }),
    getAttachmentViewObject: () => ({
      event: (
        <FormattedMessage
          id="xpack.ml.cases.singleMetricViewer.embeddableAddedEvent"
          defaultMessage="added single metric viewer"
        />
      ),
      timelineAvatar: PLUGIN_ICON,
      children: React.lazy(async () => {
        const { initComponent } = await import('./single_metric_viewer_attachment');
        return {
          default: initComponent(pluginStart.fieldFormats),
        };
      }),
    }),
  });
}
