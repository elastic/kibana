/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CasesPublicSetup } from '@kbn/cases-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { CASE_ATTACHMENT_TYPE_ID_ANOMALY_EXPLORER_CHARTS } from '../../common/constants/cases';
import type { MlStartDependencies } from '../plugin';
import { PLUGIN_ICON } from '../../common/constants/app';
import { getAnomalyChartsServiceDependencies } from '../embeddables/anomaly_charts/get_anomaly_charts_services_dependencies';

export function registerAnomalyChartsCasesAttachment(
  cases: CasesPublicSetup,
  coreStart: CoreStart,
  pluginStart: MlStartDependencies
) {
  cases.attachmentFramework.registerPersistableState({
    id: CASE_ATTACHMENT_TYPE_ID_ANOMALY_EXPLORER_CHARTS,
    icon: PLUGIN_ICON,
    displayName: i18n.translate('xpack.ml.cases.anomalyCharts.displayName', {
      defaultMessage: 'Anomaly charts',
    }),
    getAttachmentViewObject: () => ({
      event: (
        <FormattedMessage
          id="xpack.ml.cases.anomalyCharts.embeddableAddedEvent"
          defaultMessage="added anomaly chart"
        />
      ),
      timelineAvatar: PLUGIN_ICON,
      children: React.lazy(async () => {
        const { initializeAnomalyChartsAttachment } = await import('./anomaly_charts_attachments');
        const services = await getAnomalyChartsServiceDependencies(coreStart, pluginStart);

        return {
          default: initializeAnomalyChartsAttachment(pluginStart.fieldFormats, services),
        };
      }),
    }),
  });
}
