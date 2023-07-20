/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Action } from '@kbn/ui-actions-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { css } from '@emotion/react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { useIntersectionListContext } from '../../../hooks/use_intersection_list';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import type { LensAttributes } from '../types';
import { ChartLoadingProgress, ChartPlaceholder } from './chart_placeholder';
import { parseDateRange } from '../../../utils/datemath';

export type LensWrapperProps = Omit<
  TypedLensByValueInput,
  'timeRange' | 'attributes' | 'viewMode'
> & {
  attributes: LensAttributes | null;
  dateRange: TimeRange;
  extraActions: Action[];
  loading?: boolean;
  inView?: boolean;
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
      throw new Error(`EmbeddableComponent attributes cannot be null`);
    }

    return <EmbeddableComponent {...props} attributes={attributes} />;
  }
);

const LensWrapperComponent = React.forwardRef<HTMLDivElement, LensWrapperProps>(
  (
    {
      attributes,
      dateRange,
      filters,
      inView,
      lastReloadRequestTime,
      loading,
      query,
      ...props
    }: LensWrapperProps,
    ref
  ) => {
    const [embeddableLoaded, setEmbeddableLoaded] = useState(false);

    const [state, setState] = useState({
      attributes,
      dateRange,
      filters,
      lastReloadRequestTime,
      query,
    });

    useEffect(() => {
      if (inView) {
        setState({
          attributes,
          dateRange,
          filters,
          lastReloadRequestTime,
          query,
        });
      }
    }, [attributes, dateRange, filters, inView, lastReloadRequestTime, query]);

    const onLoad = useCallback(() => {
      if (!embeddableLoaded) {
        setEmbeddableLoaded(true);
      }
    }, [embeddableLoaded]);

    const parsedDateRange: TimeRange = useMemo(() => {
      const { from = state.dateRange.from, to = state.dateRange.to } = parseDateRange(
        state.dateRange
      );

      return { from, to, mode: 'absolute' };
    }, [state.dateRange]);

    return (
      <Container
        ref={ref}
        css={css`
          .echLegend .echLegendList {
            display: flex;
          }
        `}
      >
        <>
          {(loading || !state.attributes) && !embeddableLoaded ? (
            <ChartPlaceholder style={props.style} hidePanelTitles />
          ) : (
            <>
              {(loading || !state.attributes) && (
                <ChartLoadingProgress hidePanelTitles={props.hidePanelTitles} />
              )}

              <EmbeddableComponentMemo
                {...props}
                attributes={state.attributes}
                viewMode={ViewMode.VIEW}
                timeRange={parsedDateRange}
                query={state.query}
                filters={state.filters}
                lastReloadRequestTime={state.lastReloadRequestTime}
                onLoad={onLoad}
              />
            </>
          )}
        </>
      </Container>
    );
  }
);

const Container = euiStyled.div`
  position: relative;
  border-radius: ${({ theme }) => theme.eui.euiSizeS};
  overflow: hidden;
  height: 100%;
`;

export const LensWrapper = (props: LensWrapperProps) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const { observer, mapping } = useIntersectionListContext();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const current = itemRef.current;
    if (!current || !observer) {
      return;
    }
    mapping.set(current, (isIntersecting) => {
      setVisible(isIntersecting);
    });

    observer?.observe(current);

    return () => {
      observer?.unobserve(current);
      mapping.delete(current);
    };
  }, [mapping, observer, setVisible]);

  return <LensWrapperComponent {...props} inView={visible} ref={itemRef} />;
};
