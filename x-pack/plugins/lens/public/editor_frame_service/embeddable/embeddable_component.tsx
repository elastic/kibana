/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useRef, MutableRefObject, useEffect } from 'react';
import { RenderMode } from 'src/plugins/expressions';
import { PaletteOutput } from 'src/plugins/charts/public';
import { TimeRange } from 'src/plugins/data/public';
import { LensEmbeddableDeps, LensEmbeddableInput } from './embeddable';
import { Embeddable } from './embeddable';
import { Document } from '../../persistence';
import { IndexPatternPersistedState } from '../../indexpattern_datasource/types';
import { XYState } from '../../xy_visualization/types';
import { PieVisualizationState } from '../../pie_visualization/types';
import { DatatableVisualizationState } from '../../datatable_visualization/visualization';
import { State as MetricState } from '../../metric_visualization/types';

type LensAttributes<TVisType, TVisState> = Omit<
  Document,
  'savedObjectId' | 'type' | 'state' | 'visualizationType'
> & {
  visualizationType: TVisType;
  state: Omit<Document['state'], 'datasourceStates' | 'visualization'> & {
    datasourceStates: {
      indexpattern: IndexPatternPersistedState;
    };
    visualization: TVisState;
  };
};

export type LensProps = Omit<LensEmbeddableInput, 'attributes'> & {
  palette?: PaletteOutput;
  renderMode?: RenderMode;
  timeRange?: TimeRange;
  height: number;
  attributes:
    | LensAttributes<'lnsXY', XYState>
    | LensAttributes<'lnsPie', PieVisualizationState>
    | LensAttributes<'lnsDatatable', DatatableVisualizationState>
    | LensAttributes<'lnsMetric', MetricState>;
};

function LensComponent({
  props: { timeRange, height, ...props },
  deps,
}: {
  props: LensProps;
  deps: LensEmbeddableDeps;
}) {
  const elementRef: MutableRefObject<HTMLDivElement | null> = useRef(null);
  const embeddableRef: MutableRefObject<Embeddable | null> = useRef(null);

  useEffect(() => {
    (async () => {
      if (elementRef.current && embeddableRef.current) {
        if (timeRange) {
          embeddableRef.current.onContainerStateChanged({ ...props, timeRange });
        }
        await embeddableRef.current.initializeSavedVis(props);
        embeddableRef.current.render(elementRef.current);
      }
    })();
    // TODO do not re-render too often
  }, [props, timeRange]);

  return (
    <div
      style={{ height }}
      ref={(newElement) => {
        if (newElement) {
          if (!embeddableRef.current) {
            embeddableRef.current = new Embeddable(deps, props);
          }
          if (timeRange) {
            embeddableRef.current.onContainerStateChanged({ ...props, timeRange });
          }
          if (elementRef.current !== newElement) {
            embeddableRef.current!.render(newElement);
          }
          elementRef.current = newElement;
        }
      }}
    />
  );
}

// eslint-disable-next-line import/no-default-export
export { LensComponent as default };
