/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CasesUiSetup } from '@kbn/cases-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE, getEmbeddableComponent } from '../embeddables';
import type { MlStartDependencies } from '../plugin';
import { PLUGIN_ICON } from '../../common/constants/app';

export function registerAnomalyChartsCasesAttachment(
  cases: CasesUiSetup,
  coreStart: CoreStart,
  pluginStart: MlStartDependencies
) {
  const EmbeddableComponent = getEmbeddableComponent(
    ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
    coreStart,
    pluginStart
  );

  cases.attachmentFramework.registerPersistableState({
    id: ANOMALY_EXPLORER_CHARTS_EMBEDDABLE_TYPE,
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
        const { initComponent } = await import('./anomaly_charts_attachments');
        return {
          default: initComponent(pluginStart.fieldFormats, EmbeddableComponent),
        };
      }),
    }),
  });
}
