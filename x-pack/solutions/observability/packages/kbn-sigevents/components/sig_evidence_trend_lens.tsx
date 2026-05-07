/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { VisualizeLens } from '@kbn/agent-builder-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { UiActionsPublicStart } from '@kbn/ui-actions-plugin/public/plugin';

export interface SigEvidenceTrendLensProps {
  readonly lensConfig: Record<string, unknown>;
  readonly rangeFrom: string;
  readonly rangeTo: string;
  readonly services: {
    lens: LensPublicStart;
    dataViews: DataViewsPublicPluginStart;
    uiActions: UiActionsPublicStart;
  };
}

/**
 * Renders the same Lens chrome as Agent Builder chat (time picker, edit/save) from a
 * `create_visualization` tool payload.
 */
export function SigEvidenceTrendLens({
  lensConfig,
  rangeFrom,
  rangeTo,
  services,
}: SigEvidenceTrendLensProps) {
  const { lens, dataViews, uiActions } = services;

  const absoluteTimeRange: TimeRange = useMemo(
    () => ({
      type: 'absolute',
      from: rangeFrom,
      to: rangeTo,
    }),
    [rangeFrom, rangeTo]
  );

  if (!lens || !dataViews || !uiActions) {
    return (
      <EuiEmptyPrompt
        iconType="error"
        title={
          <h3>
            {i18n.translate('xpack.observability.sigeventsOverview.trend.lensUnavailableTitle', {
              defaultMessage: 'Charts are unavailable',
            })}
          </h3>
        }
        body={
          <p>
            {i18n.translate('xpack.observability.sigeventsOverview.trend.lensUnavailableBody', {
              defaultMessage:
                'Lens, data views, or UI actions are not available in this deployment.',
            })}
          </p>
        }
      />
    );
  }

  return (
    <div data-test-subj="obltSigeventsEvidenceTrendLens">
      <VisualizeLens
        lens={lens}
        dataViews={dataViews}
        uiActions={uiActions}
        lensConfig={lensConfig}
        timeRange={absoluteTimeRange}
      />
    </div>
  );
}
