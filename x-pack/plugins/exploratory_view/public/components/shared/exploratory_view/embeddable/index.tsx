/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { EuiErrorBoundary } from '@elastic/eui';
import styled from 'styled-components';
import { DataView } from '@kbn/data-views-plugin/common';
import { FormulaPublicApi } from '@kbn/lens-plugin/public';
import { i18n } from '@kbn/i18n';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { useAppDataView } from './use_app_data_view';
import type { ExploratoryViewPublicPluginsStart } from '../../../..';
import type { ExploratoryEmbeddableProps, ExploratoryEmbeddableComponentProps } from './embeddable';

const Embeddable = React.lazy(() => import('./embeddable'));

function ExploratoryViewEmbeddable(props: ExploratoryEmbeddableComponentProps) {
  return (
    <React.Suspense fallback={<EuiLoadingSpinner />}>
      <Embeddable {...props} />
    </React.Suspense>
  );
}

export function getExploratoryViewEmbeddable(
  services: CoreStart & ExploratoryViewPublicPluginsStart
) {
  const { lens, dataViews: dataViewsService, uiSettings } = services;

  const dataViewCache: Record<string, DataView> = {};

  const lenStateHelperPromise: Promise<{ formula: FormulaPublicApi }> | null = null;

  const lastRefreshed: Record<string, { from: string; to: string }> = {};

  const hasSameTimeRange = (props: ExploratoryEmbeddableProps) => {
    const { attributes } = props;
    if (!attributes || attributes?.length === 0) {
      return false;
    }
    const series = attributes[0];
    const { time } = series;
    const { from, to } = time;
    return attributes.every((seriesT) => {
      const { time: timeT } = seriesT;
      return timeT.from === from && timeT.to === to;
    });
  };

  return (props: ExploratoryEmbeddableProps) => {
    useEffect(() => {
      if (!services.data.search.session.getSessionId()) {
        services.data.search.session.start();
      }
    }, []);

    const { dataTypesIndexPatterns, attributes, customHeight } = props;

    if (!dataViewsService || !lens || !attributes || attributes?.length === 0) {
      return null;
    }

    const series = attributes[0];

    const isDarkMode = uiSettings?.get('theme:darkMode');

    const { data: lensHelper, loading: lensLoading } = useFetcher(async () => {
      if (lenStateHelperPromise) {
        return lenStateHelperPromise;
      }
      return lens.stateHelperApi();
    }, []);

    const [loadCount, setLoadCount] = useState(0);

    const onLensLoaded = useCallback(
      (lensLoaded: boolean) => {
        if (lensLoaded && props.id && hasSameTimeRange(props) && !lastRefreshed[props.id]) {
          lastRefreshed[props.id] = series.time;
        }
        setLoadCount((prev) => prev + 1);
      },
      [props, series.time]
    );

    const { dataViews, loading } = useAppDataView({
      series,
      dataViewCache,
      dataViewsService,
      dataTypesIndexPatterns,
      seriesDataType: series?.dataType,
    });

    const embedProps = useMemo(() => {
      const newProps = { ...props };
      if (props.sparklineMode) {
        newProps.axisTitlesVisibility = { x: false, yRight: false, yLeft: false };
        newProps.legendIsVisible = false;
        newProps.hideTicks = true;
      }
      if (props.id && lastRefreshed[props.id] && loadCount < 2) {
        newProps.attributes = props.attributes?.map((seriesT) => ({
          ...seriesT,
          time: lastRefreshed[props.id!],
        }));
      } else if (props.id) {
        lastRefreshed[props.id] = series.time;
      }
      return newProps;
    }, [loadCount, props, series.time]);

    if (Object.keys(dataViews).length === 0 || loading || !lensHelper || lensLoading) {
      return (
        <LoadingWrapper customHeight={customHeight}>
          <EuiLoadingSpinner size="l" />
        </LoadingWrapper>
      );
    }

    if (!dataViews[series?.dataType]) {
      return <EmptyState height={props.customHeight} />;
    }

    return (
      <EuiErrorBoundary>
        <EuiThemeProvider darkMode={isDarkMode}>
          <KibanaContextProvider services={services}>
            <Wrapper customHeight={props.customHeight} data-test-subj={props.dataTestSubj}>
              <ExploratoryViewEmbeddable
                {...embedProps}
                dataViewState={dataViews}
                lens={lens}
                lensFormulaHelper={lensHelper.formula}
                searchSessionId={services.data.search.session.getSessionId()}
                onLoad={onLensLoaded}
              />
            </Wrapper>
          </KibanaContextProvider>
        </EuiThemeProvider>
      </EuiErrorBoundary>
    );
  };
}

const Wrapper = styled.div<{
  customHeight?: string;
}>`
  height: ${(props) => (props.customHeight ? `${props.customHeight};` : `100%;`)};
`;

const LoadingWrapper = styled.div<{
  customHeight?: string;
}>`
  height: ${(props) => (props.customHeight ? `${props.customHeight};` : `100%;`)};
  display: flex;
  align-items: center;
  justify-content: center;
`;

function EmptyState({ height }: { height?: string }) {
  return (
    <EuiFlexGroup alignItems="center" justifyContent="center" style={{ height: height ?? '100%' }}>
      <EuiFlexItem grow={false}>
        <span>{NO_DATA_LABEL}</span>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

const NO_DATA_LABEL = i18n.translate('xpack.exploratoryView.noData', {
  defaultMessage: 'No data',
});
