/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { LensAttributes } from '@kbn/lens-embeddable-utils';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { ChartLoadingProgress, ChartPlaceholder } from './chart_placeholder';
import { parseDateRange } from '../../utils/datemath';

export type LensWrapperProps = Omit<
  TypedLensByValueInput,
  'timeRange' | 'attributes' | 'viewMode'
> & {
  attributes: LensAttributes | null;
  dateRange: TimeRange;
  extraActions: Action[];
  loading?: boolean;
};

export const LensWrapper = ({
  attributes,
  dateRange,
  filters,
  lastReloadRequestTime,
  loading = false,
  query,
  ...props
}: LensWrapperProps) => {
  const { euiTheme } = useEuiTheme();
  const [intersectionObserverEntry, setIntersectionObserverEntry] =
    useState<IntersectionObserverEntry>();
  const [embeddableLoaded, setEmbeddableLoaded] = useState(false);
  const [state, setState] = useState({
    attributes,
    dateRange,
    filters,
    lastReloadRequestTime,
    query,
  });

  const ref = useRef<HTMLDivElement>(null);
  const observerRef = useRef(
    new IntersectionObserver(([value]) => setIntersectionObserverEntry(value), {
      root: ref.current,
    })
  );

  useEffect(() => {
    const { current: currentObserver } = observerRef;
    currentObserver.disconnect();
    const { current } = ref;

    if (current) {
      currentObserver.observe(current);
    }

    return () => currentObserver.disconnect();
  }, [ref]);

  useEffect(() => {
    if (intersectionObserverEntry?.isIntersecting) {
      setState({
        attributes,
        dateRange,
        filters,
        lastReloadRequestTime,
        query,
      });
    }
  }, [
    attributes,
    dateRange,
    filters,
    intersectionObserverEntry?.isIntersecting,
    lastReloadRequestTime,
    query,
  ]);

  const onLoad = useCallback(() => {
    if (!embeddableLoaded) {
      setEmbeddableLoaded(true);
    }
  }, [embeddableLoaded]);

  const parsedDateRange: TimeRange = useMemo(() => {
    const { from = state.dateRange.from, to = state.dateRange.to } = parseDateRange(
      state.dateRange
    );

    return { from, to };
  }, [state.dateRange]);
  const isLoading = loading || !state.attributes;

  return (
    <div
      css={css`
        position: relative;
        border-radius: ${euiTheme.size.s};
        overflow: hidden;
        height: 100%;
        .echMetric {
          border-radius: ${euiTheme.border.radius.medium};
          pointer-events: none;
        }
      `}
      ref={ref}
    >
      <>
        {isLoading && !embeddableLoaded ? (
          <ChartPlaceholder style={props.style} />
        ) : (
          <>
            {isLoading && <ChartLoadingProgress hasTopMargin={!props.hidePanelTitles} />}
            <EmbeddableComponentMemo
              {...props}
              attributes={state.attributes}
              filters={state.filters}
              lastReloadRequestTime={state.lastReloadRequestTime}
              onLoad={onLoad}
              query={state.query}
              timeRange={parsedDateRange}
              viewMode={ViewMode.VIEW}
            />
          </>
        )}
      </>
    </div>
  );
};

const EmbeddableComponentMemo = React.memo(
  ({
    attributes,
    ...props
  }: Omit<TypedLensByValueInput, 'attributes'> & { attributes: LensAttributes | null }) => {
    const {
      services: { lens },
    } = useKibanaContextForPlugin();

    const EmbeddableComponent = lens.EmbeddableComponent;

    if (!attributes) {
      return <ChartPlaceholder style={props.style} />;
    }

    return <EmbeddableComponent {...props} attributes={attributes} />;
  }
);
