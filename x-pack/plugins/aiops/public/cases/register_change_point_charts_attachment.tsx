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
import {
  CASES_ATTACHMENT_CHANGE_POINT_CHART,
  EMBEDDABLE_CHANGE_POINT_CHART_TYPE,
} from '@kbn/aiops-change-point-detection/constants';
import { getEmbeddableChangePointChart } from '../embeddable/embeddable_change_point_chart_component';
import type { AiopsPluginStartDeps } from '../types';

export function registerChangePointChartsAttachment(
  cases: CasesPublicSetup,
  coreStart: CoreStart,
  pluginStart: AiopsPluginStartDeps
) {
  const EmbeddableComponent = getEmbeddableChangePointChart(
    EMBEDDABLE_CHANGE_POINT_CHART_TYPE,
    coreStart,
    pluginStart
  );

  cases.attachmentFramework.registerPersistableState({
    id: CASES_ATTACHMENT_CHANGE_POINT_CHART,
    icon: 'machineLearningApp',
    displayName: i18n.translate('xpack.aiops.changePointDetection.cases.attachmentName', {
      defaultMessage: 'Change point chart',
    }),
    getAttachmentViewObject: () => ({
      event: (
        <FormattedMessage
          id="xpack.aiops.changePointDetection.cases.attachmentEvent"
          defaultMessage="added change point chart"
        />
      ),
      timelineAvatar: 'machineLearningApp',
      children: React.lazy(async () => {
        const { initComponent } = await import('./change_point_charts_attachment');

        return {
          default: initComponent(pluginStart.fieldFormats, EmbeddableComponent),
        };
      }),
    }),
  });
}
