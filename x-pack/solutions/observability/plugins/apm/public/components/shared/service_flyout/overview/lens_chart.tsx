/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingChart, EuiPanel, EuiTitle } from '@elastic/eui';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import React, { memo, useEffect, useMemo, useRef } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { useServiceFlyoutContext } from '../service_flyout_context';
import type { LensESQLConfig } from './types';

const CHART_HEIGHT = 200;

export interface FlyoutLensChartDeps {
  lens: LensPublicStart;
  dataViews: DataViewsPublicPluginStart;
}

export interface FlyoutLensChartProps {
  deps: FlyoutLensChartDeps;
  id: string;
  title: string;
  titleAction?: React.ReactNode;
  config?: LensESQLConfig;
  rangeFrom: string;
  rangeTo: string;
  refreshToken?: number;
  dataTestSubjPrefix?: string;
  embeddableIdPrefix?: string;
  executionContextDescription?: string;
  executionContextProfileId?: string;
}

function FlyoutLensChartComponent({
  deps: { lens, dataViews },
  id,
  title,
  titleAction,
  config,
  rangeFrom,
  rangeTo,
  refreshToken = 0,
  dataTestSubjPrefix = 'serviceFlyoutLensChart',
  embeddableIdPrefix = 'service-flyout',
  executionContextDescription = 'apm service flyout chart data',
  executionContextProfileId = 'service-flyout',
}: FlyoutLensChartProps) {
  const timeRange = useMemo(() => ({ from: rangeFrom, to: rangeTo }), [rangeFrom, rangeTo]);

  const { value: builtAttributes } = useAsync(async () => {
    if (!config) {
      return undefined;
    }
    const builder = new LensConfigBuilder(dataViews);
    return builder.build(config, {
      query: { esql: config.dataset.esql },
    }) as Promise<LensAttributes>;
  }, [config, dataViews]);

  const lastAttributes = useRef<LensAttributes | undefined>(undefined);

  useEffect(() => {
    if (builtAttributes) lastAttributes.current = builtAttributes;
  }, [builtAttributes]);

  const attributes = builtAttributes ?? lastAttributes.current;

  const LensEmbeddableComponent = lens?.EmbeddableComponent;

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="none"
      data-test-subj={`${dataTestSubjPrefix}-${id}`}
      css={css`
        min-height: ${CHART_HEIGHT}px;
      `}
    >
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        justifyContent="spaceBetween"
        css={css`
          padding: 8px 12px 0;
        `}
      >
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4 css={{ whiteSpace: 'nowrap' }}>{title}</h4>
          </EuiTitle>
        </EuiFlexItem>
        {titleAction ? <EuiFlexItem grow={false}>{titleAction}</EuiFlexItem> : null}
      </EuiFlexGroup>
      <div
        css={css`
          height: ${CHART_HEIGHT}px;
        `}
      >
        {attributes && LensEmbeddableComponent ? (
          <LensEmbeddableComponent
            id={`${embeddableIdPrefix}-${id}`}
            attributes={attributes}
            timeRange={timeRange}
            hidePanelTitles
            noPadding
            withDefaultActions={false}
            lastReloadRequestTime={refreshToken}
            viewMode="view"
            style={{ height: CHART_HEIGHT }}
            executionContext={{
              description: executionContextDescription,
              meta: { profile_id: executionContextProfileId, metric_id: id },
            }}
          />
        ) : (
          <EuiFlexGroup
            style={{ height: '100%' }}
            justifyContent="center"
            alignItems="center"
            responsive={false}
            data-test-subj={`${dataTestSubjPrefix}Loading-${id}`}
          >
            <EuiFlexItem grow={false}>
              <EuiLoadingChart size="l" />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </div>
    </EuiPanel>
  );
}

export const FlyoutLensChart: React.FC<FlyoutLensChartProps> = memo(FlyoutLensChartComponent);

interface ServiceFlyoutLensChartProps {
  id: string;
  title: string;
  titleAction?: React.ReactNode;
  config?: LensESQLConfig;
  rangeFrom: string;
  rangeTo: string;
  refreshToken: number;
}

function ServiceFlyoutLensChartComponent(props: ServiceFlyoutLensChartProps) {
  const {
    deps: { lens, dataViews },
  } = useServiceFlyoutContext();

  return <FlyoutLensChart deps={{ lens, dataViews }} {...props} />;
}

export const ServiceFlyoutLensChart: React.FC<ServiceFlyoutLensChartProps> = memo(
  ServiceFlyoutLensChartComponent
);
