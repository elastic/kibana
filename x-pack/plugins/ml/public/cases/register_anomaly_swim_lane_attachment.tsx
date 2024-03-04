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
import { CASE_ATTACHMENT_TYPE_ID_ANOMALY_SWIMLANE } from '../../common/constants/cases';
import { getEmbeddableComponent } from '../embeddables';
import type { MlStartDependencies } from '../plugin';
import { PLUGIN_ICON } from '../../common/constants/app';

export function registerAnomalySwimLaneCasesAttachment(
  cases: CasesUiSetup,
  coreStart: CoreStart,
  pluginStart: MlStartDependencies
) {
  const EmbeddableComponent = getEmbeddableComponent(
    CASE_ATTACHMENT_TYPE_ID_ANOMALY_SWIMLANE,
    coreStart,
    pluginStart
  );

  cases.attachmentFramework.registerPersistableState({
    id: CASE_ATTACHMENT_TYPE_ID_ANOMALY_SWIMLANE,
    icon: PLUGIN_ICON,
    displayName: i18n.translate('xpack.ml.cases.anomalySwimLane.displayName', {
      defaultMessage: 'Anomaly swim lane',
    }),
    getAttachmentViewObject: () => ({
      event: (
        <FormattedMessage
          id="xpack.ml.cases.anomalySwimLane.embeddableAddedEvent"
          defaultMessage="added anomaly swim lane"
        />
      ),
      timelineAvatar: PLUGIN_ICON,
      children: React.lazy(async () => {
        const { initComponent } = await import('./anomaly_swim_lane_attachment');
        return {
          default: initComponent(pluginStart.fieldFormats, EmbeddableComponent),
        };
      }),
    }),
  });
}
