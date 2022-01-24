/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { EuiButtonEmpty, EuiResizableContainer, EuiTitle } from '@elastic/eui';
import { PanelDirection } from '@elastic/eui/src/components/resizable_container/types';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityPublicPluginsStart } from '../../../plugin';
import { ExploratoryViewHeader } from './header/header';
import { useSeriesStorage } from './hooks/use_series_storage';
import { useLensAttributes } from './hooks/use_lens_attributes';
import { TypedLensByValueInput } from '../../../../../lens/public';
import { useAppIndexPatternContext } from './hooks/use_app_index_pattern';
import { SeriesViews } from './views/series_views';
import { LensEmbeddable } from './lens_embeddable';
import { EmptyView } from './components/empty_view';
import type { ChartTimeRange } from './header/last_updated';

export type PanelId = 'seriesPanel' | 'chartPanel';

export function ExploratoryView({
  saveAttributes,
}: {
  saveAttributes?: (attr: TypedLensByValueInput['attributes'] | null) => void;
}) {
  const {
    services: { lens },
  } = useKibana<ObservabilityPublicPluginsStart>();

  const seriesBuilderRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [height, setHeight] = useState<string>('100vh');

  const [chartTimeRangeContext, setChartTimeRangeContext] = useState<ChartTimeRange | undefined>();

  const [lensAttributes, setLensAttributes] = useState<TypedLensByValueInput['attributes'] | null>(
    null
  );

  const { loadIndexPattern, loading } = useAppIndexPatternContext();

  const { firstSeries, allSeries, lastRefresh, reportType } = useSeriesStorage();

  const lensAttributesT = useLensAttributes();

  const setHeightOffset = () => {
    if (seriesBuilderRef?.current && wrapperRef.current) {
      const headerOffset = wrapperRef.current.getBoundingClientRect().top;
      setHeight(`calc(100vh - ${headerOffset + 40}px)`);
    }
  };

  useEffect(() => {
    allSeries.forEach((seriesT) => {
      loadIndexPattern({
        dataType: seriesT.dataType,
      });
    });
  }, [allSeries, loadIndexPattern]);

  useEffect(() => {
    setLensAttributes(lensAttributesT);
    if (saveAttributes) {
      saveAttributes(lensAttributesT);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(lensAttributesT ?? {}), lastRefresh]);

  useEffect(() => {
    setHeightOffset();
  });

  const collapseFn = useRef<(id: PanelId, direction: PanelDirection) => void>();

  const [hiddenPanel, setHiddenPanel] = useState('');

  const onCollapse = (panelId: string) => {
    setHiddenPanel((prevState) => (panelId === prevState ? '' : panelId));
  };

  const onChange = (panelId: PanelId) => {
    onCollapse(panelId);
    if (collapseFn.current) {
      collapseFn.current(panelId, panelId === 'seriesPanel' ? 'right' : 'left');
    }
  };

  return lens ? (
    <>
      <ExploratoryViewHeader
        lensAttributes={lensAttributes}
        chartTimeRange={chartTimeRangeContext}
      />
      <LensWrapper ref={wrapperRef} height={height}>
        <ResizableContainer direction="vertical" onToggleCollapsed={onCollapse}>
          {(EuiResizablePanel, EuiResizableButton, { togglePanel }) => {
            collapseFn.current = (id, direction) => togglePanel?.(id, { direction });

            return (
              <>
                <EuiResizablePanel
                  initialSize={40}
                  minSize={'30%'}
                  mode={'collapsible'}
                  id="chartPanel"
                >
                  {lensAttributes ? (
                    <LensEmbeddable
                      setChartTimeRangeContext={setChartTimeRangeContext}
                      lensAttributes={lensAttributes}
                    />
                  ) : (
                    <EmptyView series={firstSeries} loading={loading} reportType={reportType} />
                  )}
                </EuiResizablePanel>
                <EuiResizableButton />
                <EuiResizablePanel
                  initialSize={60}
                  minSize="10%"
                  mode={'main'}
                  id="seriesPanel"
                  color="subdued"
                  className="paddingTopSmall"
                >
                  <ChartToggle
                    isCollapsed={hiddenPanel === 'chartPanel'}
                    onClick={() => onChange('chartPanel')}
                  />

                  <SeriesViews
                    seriesBuilderRef={seriesBuilderRef}
                    onSeriesPanelCollapse={onChange}
                  />
                </EuiResizablePanel>
              </>
            );
          }}
        </ResizableContainer>
        {hiddenPanel === 'seriesPanel' && (
          <ShowPreview onClick={() => onChange('seriesPanel')} iconType="arrowUp">
            {PREVIEW_LABEL}
          </ShowPreview>
        )}
      </LensWrapper>
    </>
  ) : (
    <EuiTitle>
      <h2>{LENS_NOT_AVAILABLE}</h2>
    </EuiTitle>
  );
}
const LensWrapper = styled.div<{ height: string }>`
  min-height: 400px;
  height: ${(props) => props.height};

  &&& > div {
    height: 100%;
  }
`;

const ResizableContainer = styled(EuiResizableContainer)`
  height: 100%;
  &&& .paddingTopSmall {
    padding-top: 8px;
  }
`;

const ShowPreview = styled(EuiButtonEmpty)`
  position: absolute;
  bottom: 34px;
`;

const ChartToggle = styled(({ isCollapsed, ...rest }) => (
  <EuiButtonEmpty
    {...(isCollapsed ? { iconType: 'arrowDown' } : { iconType: 'arrowUp', color: 'text' })}
    {...rest}
  >
    {isCollapsed ? SHOW_CHART_LABEL : HIDE_CHART_LABEL}
  </EuiButtonEmpty>
))`
  &:focus,
  &:focus:enabled {
    background: none;
  }
  position: absolute;
  top: -30px;
  right: 0;
`;

const HIDE_CHART_LABEL = i18n.translate('xpack.observability.overview.exploratoryView.hideChart', {
  defaultMessage: 'Hide chart',
});

const SHOW_CHART_LABEL = i18n.translate('xpack.observability.overview.exploratoryView.showChart', {
  defaultMessage: 'Show chart',
});

const PREVIEW_LABEL = i18n.translate('xpack.observability.overview.exploratoryView.preview', {
  defaultMessage: 'Preview',
});

const LENS_NOT_AVAILABLE = i18n.translate(
  'xpack.observability.overview.exploratoryView.lensDisabled',
  {
    defaultMessage: 'Lens app is not available, please enable Lens to use exploratory view.',
  }
);
