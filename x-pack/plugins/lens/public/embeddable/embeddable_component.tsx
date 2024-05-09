/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { Action, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { Start as InspectorStartContract } from '@kbn/inspector-plugin/public';
import { PanelLoader } from '@kbn/panel-loader';
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
import type { FormBasedPersistedState } from '../datasources/form_based/types';
import type { TextBasedPersistedState } from '../datasources/text_based/types';
import type { XYState } from '../visualizations/xy/types';
import type {
  PieVisualizationState,
  LegacyMetricState,
  AllowedGaugeOverrides,
  AllowedPartitionOverrides,
  AllowedSettingsOverrides,
  AllowedXYOverrides,
} from '../../common/types';
import type { DatatableVisualizationState } from '../visualizations/datatable/visualization';
import type { MetricVisualizationState } from '../visualizations/metric/types';
import type { HeatmapVisualizationState } from '../visualizations/heatmap/types';
import type { GaugeVisualizationState } from '../visualizations/gauge/constants';

type LensAttributes<TVisType, TVisState> = Omit<
  Document,
  'savedObjectId' | 'type' | 'state' | 'visualizationType'
> & {
  visualizationType: TVisType;
  state: Omit<Document['state'], 'datasourceStates' | 'visualization'> & {
    datasourceStates: {
      formBased?: FormBasedPersistedState;
      textBased?: TextBasedPersistedState;
    };
    visualization: TVisState;
  };
};

/**
 * Type-safe variant of by value embeddable input for Lens.
 * This can be used to hardcode certain Lens chart configurations within another app.
 */
export type TypedLensByValueInput = Omit<LensByValueInput, 'attributes' | 'overrides'> & {
  attributes:
    | LensAttributes<'lnsXY', XYState>
    | LensAttributes<'lnsPie', PieVisualizationState>
    | LensAttributes<'lnsHeatmap', HeatmapVisualizationState>
    | LensAttributes<'lnsGauge', GaugeVisualizationState>
    | LensAttributes<'lnsDatatable', DatatableVisualizationState>
    | LensAttributes<'lnsLegacyMetric', LegacyMetricState>
    | LensAttributes<'lnsMetric', MetricVisualizationState>
    | LensAttributes<string, unknown>;

  /**
   * Overrides can tweak the style of the final embeddable and are executed at the end of the Lens rendering pipeline.
   * XY charts offer an override of the Settings ('settings') and Axis ('axisX', 'axisLeft', 'axisRight') components.
   * While it is not possible to pass function/callback/handlers to the renderer, it is possible to stop them by passing the
   * "ignore" string as override value (i.e. onBrushEnd: "ignore")
   */
  overrides?:
    | AllowedSettingsOverrides
    | AllowedXYOverrides
    | AllowedPartitionOverrides
    | AllowedGaugeOverrides;
};

export type EmbeddableComponentProps = (TypedLensByValueInput | LensByReferenceInput) & {
  withDefaultActions?: boolean;
  extraActions?: Action[];
  showInspector?: boolean;
  abortController?: AbortController;
};

export type EmbeddableComponent = React.ComponentType<EmbeddableComponentProps>;

interface PluginsStartDependencies {
  uiActions: UiActionsStart;
  embeddable: EmbeddableStart;
  inspector: InspectorStartContract;
}

export function getEmbeddableComponent(core: CoreStart, plugins: PluginsStartDependencies) {
  const { embeddable: embeddableStart, uiActions } = plugins;
  const factory = embeddableStart.getEmbeddableFactory('lens')!;
  return (props: EmbeddableComponentProps) => {
    const input = { ...props };
    const hasActions =
      Boolean(input.withDefaultActions) || (input.extraActions && input.extraActions?.length > 0);

    if (hasActions) {
      return (
        <EmbeddablePanelWrapper
          factory={factory}
          uiActions={uiActions}
          actionPredicate={() => hasActions}
          input={input}
          extraActions={input.extraActions}
          showInspector={input.showInspector}
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
  actionPredicate: (id: string) => boolean;
  input: EmbeddableComponentProps;
  extraActions?: Action[];
  showInspector?: boolean;
  withDefaultActions?: boolean;
  abortController?: AbortController;
}

const EmbeddablePanelWrapper: FC<EmbeddablePanelWrapperProps> = ({
  factory,
  uiActions,
  actionPredicate,
  input,
  extraActions,
  showInspector = true,
  withDefaultActions,
  abortController,
}) => {
  const [embeddable, loading] = useEmbeddableFactory({ factory, input });
  useEffect(() => {
    if (embeddable) {
      embeddable.updateInput(input);
    }
  }, [embeddable, input]);

  if (loading || !embeddable) {
    return <PanelLoader />;
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
      hideInspector={!showInspector}
      actionPredicate={actionPredicate}
      showNotifications={false}
      showShadow={false}
      showBadges={false}
    />
  );
};
