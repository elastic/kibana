/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiEmptyPrompt, EuiErrorBoundary } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
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

export function SigEvidenceTrendLens({
  lensConfig,
  rangeFrom,
  rangeTo,
  services,
}: SigEvidenceTrendLensProps) {
  const { lens, dataViews, uiActions } = services;

  const timeRange: TimeRange = useMemo(
    () => ({ type: 'absolute', from: rangeFrom, to: rangeTo }),
    [rangeFrom, rangeTo]
  );

  const attributes = useMemo(() => {
    try {
      return new LensConfigBuilder().fromAPIFormat(lensConfig as any);
    } catch {
      return null;
    }
  }, [lensConfig]);

  if (!lens || !dataViews || !uiActions) {
    return (
      <EuiEmptyPrompt
        iconType="error"
        title={
          <h3>
            {i18n.translate('xpack.nightshift.sigeventsOverview.trend.lensUnavailableTitle', {
              defaultMessage: 'Charts are unavailable',
            })}
          </h3>
        }
        body={
          <p>
            {i18n.translate('xpack.nightshift.sigeventsOverview.trend.lensUnavailableBody', {
              defaultMessage:
                'Lens, data views, or UI actions are not available in this deployment.',
            })}
          </p>
        }
      />
    );
  }

  if (!attributes) {
    return null;
  }

  const EmbeddableComponent = lens.EmbeddableComponent;

  return (
    <EuiErrorBoundary>
      <div
        data-test-subj="obltSigeventsEvidenceTrendLens"
        style={{ height: 200, background: 'transparent' }}
      >
        <EmbeddableComponent
          id=""
          attributes={attributes}
          timeRange={timeRange}
          style={{ height: '100%' }}
          withDefaultActions
          disabledActions={['ACTION_OPEN_IN_DISCOVER']}
        />
      </div>
    </EuiErrorBoundary>
  );
}
