/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect } from 'react';
import type { CoreStart, ThemeServiceStart } from '@kbn/core/public';
import type { Action, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import { EuiLoadingChart } from '@elastic/eui';
import {
  EmbeddableFactory,
  EmbeddableInput,
  EmbeddableOutput,
  EmbeddablePanel,
  EmbeddableRoot,
  EmbeddableStart,
  IEmbeddable,
  useEmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import type { LensByReferenceInput, LensByValueInput } from './embeddable';
import type { Document } from '../persistence';
import type { IndexPatternPersistedState } from '../indexpattern_datasource/types';
import type { XYState } from '../xy_visualization/types';
import type { PieVisualizationState, MetricState } from '../../common';
import type { DatatableVisualizationState } from '../datatable_visualization/visualization';
import type { HeatmapVisualizationState } from '../heatmap_visualization/types';
import type { GaugeVisualizationState } from '../visualizations/gauge/constants';

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

/**
 * Type-safe variant of by value embeddable input for Lens.
 * This can be used to hardcode certain Lens chart configurations within another app.
 */
export type TypedLensByValueInput = Omit<LensByValueInput, 'attributes'> & {
  attributes:
    | LensAttributes<'lnsXY', XYState>
    | LensAttributes<'lnsPie', PieVisualizationState>
    | LensAttributes<'lnsDatatable', DatatableVisualizationState>
    | LensAttributes<'lnsMetric', MetricState>
    | LensAttributes<'lnsHeatmap', HeatmapVisualizationState>
    | LensAttributes<'lnsGauge', GaugeVisualizationState>
    | LensAttributes<string, unknown>;
};

export type EmbeddableComponentProps = (TypedLensByValueInput | LensByReferenceInput) & {
  withDefaultActions?: boolean;
  extraActions?: Action[];
};

interface PluginsStartDependencies {
  uiActions: UiActionsStart;
  embeddable: EmbeddableStart;
  inspector: InspectorStartContract;
}

export function getEmbeddableComponent(core: CoreStart, plugins: PluginsStartDependencies) {
  const { embeddable: embeddableStart, uiActions, inspector } = plugins;
  const factory = embeddableStart.getEmbeddableFactory('lens')!;
  const theme = core.theme;
  return (props: EmbeddableComponentProps) => {
    const input = { ...props };
    const hasActions =
      Boolean(input.withDefaultActions) || (input.extraActions && input.extraActions?.length > 0);

    if (hasActions) {
      return (
        <EmbeddablePanelWrapper
          factory={factory}
          uiActions={uiActions}
          inspector={inspector}
          actionPredicate={() => hasActions}
          input={input}
          theme={theme}
          extraActions={input.extraActions}
          withDefaultActions={input.withDefaultActions}
        />
      );
    }
    return <EmbeddableRootWrapper factory={factory} input={input} />;
  };
}

function EmbeddableRootWrapper({
  factory,
  input,
}: {
  factory: EmbeddableFactory<EmbeddableInput, EmbeddableOutput>;
  input: EmbeddableComponentProps;
}) {
  const [embeddable, loading, error] = useEmbeddableFactory({ factory, input });
  if (loading) {
    return <EuiLoadingChart />;
  }
  return <EmbeddableRoot embeddable={embeddable} loading={loading} error={error} input={input} />;
}

interface EmbeddablePanelWrapperProps {
  factory: EmbeddableFactory<EmbeddableInput, EmbeddableOutput>;
  uiActions: PluginsStartDependencies['uiActions'];
  inspector: PluginsStartDependencies['inspector'];
  actionPredicate: (id: string) => boolean;
  input: EmbeddableComponentProps;
  theme: ThemeServiceStart;
  extraActions?: Action[];
  withDefaultActions?: boolean;
}

const EmbeddablePanelWrapper: FC<EmbeddablePanelWrapperProps> = ({
  factory,
  uiActions,
  actionPredicate,
  inspector,
  input,
  theme,
  extraActions,
  withDefaultActions,
}) => {
  const [embeddable, loading] = useEmbeddableFactory({ factory, input });
  useEffect(() => {
    if (embeddable) {
      embeddable.updateInput(input);
    }
  }, [embeddable, input]);

  if (loading || !embeddable) {
    return <EuiLoadingChart />;
  }

  return (
    <EmbeddablePanel
      hideHeader={false}
      embeddable={embeddable as IEmbeddable<EmbeddableInput, EmbeddableOutput>}
      getActions={async (triggerId, context) => {
        const actions = withDefaultActions
          ? await uiActions.getTriggerCompatibleActions(triggerId, context)
          : [];

        return [...(extraActions ?? []), ...actions];
      }}
      inspector={inspector}
      actionPredicate={actionPredicate}
      showShadow={false}
      showBadges={false}
      showNotifications={false}
      theme={theme}
    />
  );
};
