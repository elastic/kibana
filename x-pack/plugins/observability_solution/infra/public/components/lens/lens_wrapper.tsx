/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { LensAttributes } from '@kbn/lens-embeddable-utils';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { ChartLoadingProgress, ChartPlaceholder } from './chart_placeholder';
import type { LensWrapperProps } from './types';

export const LensWrapper = ({
  attributes,
  dateRange,
  filters,
  searchSessionId,
  loading = false,
  onLoad,
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
    query,
    searchSessionId,
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
        query,
        searchSessionId,
      });
    }
  }, [
    attributes,
    dateRange,
    filters,
    intersectionObserverEntry?.isIntersecting,
    query,
    searchSessionId,
  ]);

  const handleOnLoad = useCallback(
    (isLoading: boolean) => {
      if (!embeddableLoaded) {
        setEmbeddableLoaded(true);
      }

      if (onLoad) {
        onLoad(isLoading);
      }
    },
    [embeddableLoaded, onLoad]
  );

  const isLoading = loading || !state.attributes;

  return (
    <div
      css={css`
        position: relative;
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
              searchSessionId={state.searchSessionId}
              attributes={state.attributes}
              filters={state.filters}
              onLoad={handleOnLoad}
              query={state.query}
              timeRange={dateRange}
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
