/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect } from 'react';
import type { CoreStart, ThemeServiceStart } from 'kibana/public';
import type { Action, UiActionsStart } from 'src/plugins/ui_actions/public';
import type { Start as InspectorStartContract } from 'src/plugins/inspector/public';
import { EuiLoadingChart } from '@elastic/eui';
import {
  EmbeddableInput,
  EmbeddableOutput,
  EmbeddablePanel,
  EmbeddableRoot,
  EmbeddableStart,
  IEmbeddable,
  useEmbeddableFactory,
} from '../../../../../src/plugins/embeddable/public';
import type { LensByReferenceInput, LensByValueInput } from './embeddable';
import type { Document } from '../persistence';
import type { IndexPatternPersistedState } from '../indexpattern_datasource/types';
import type { XYState } from '../xy_visualization/types';
import type { PieVisualizationState, MetricState } from '../../common/expressions';
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
  return (props: EmbeddableComponentProps) => {
    const { embeddable: embeddableStart, uiActions, inspector } = plugins;
    const factory = embeddableStart.getEmbeddableFactory('lens')!;
    const input = { ...props };
    const [embeddable, loading, error] = useEmbeddableFactory({ factory, input });
    const hasActions =
      Boolean(props.withDefaultActions) || (props.extraActions && props.extraActions?.length > 0);

    const theme = core.theme;

    if (loading) {
      return <EuiLoadingChart />;
    }

    if (embeddable && hasActions) {
      return (
        <EmbeddablePanelWrapper
          embeddable={embeddable as IEmbeddable<EmbeddableInput, EmbeddableOutput>}
          uiActions={uiActions}
          inspector={inspector}
          actionPredicate={() => hasActions}
          input={input}
          theme={theme}
          extraActions={props.extraActions}
          withDefaultActions={props.withDefaultActions}
        />
      );
    }

    return <EmbeddableRoot embeddable={embeddable} loading={loading} error={error} input={input} />;
  };
}

interface EmbeddablePanelWrapperProps {
  actionPredicate: (id: string) => boolean;
  embeddable: IEmbeddable<EmbeddableInput, EmbeddableOutput>;
  extraActions?: Action[];
  hideHeader?: boolean;
  input: EmbeddableComponentProps;
  inspector: PluginsStartDependencies['inspector'];
  showShadow?: boolean;
  theme: ThemeServiceStart;
  uiActions: PluginsStartDependencies['uiActions'];
  withDefaultActions?: boolean;
}

const EmbeddablePanelWrapper: FC<EmbeddablePanelWrapperProps> = ({
  actionPredicate,
  embeddable,
  extraActions,
  hideHeader = false,
  input,
  inspector,
  showShadow = false,
  theme,
  uiActions,
  withDefaultActions,
}) => {
  useEffect(() => {
    embeddable.updateInput(input);
  }, [embeddable, input]);

  return (
    <EmbeddablePanel
      hideHeader={hideHeader}
      embeddable={embeddable as IEmbeddable<EmbeddableInput, EmbeddableOutput>}
      getActions={async (triggerId, context) => {
        const actions = withDefaultActions
          ? await uiActions.getTriggerCompatibleActions(triggerId, context)
          : [];

        return [...(extraActions ?? []), ...actions];
      }}
      inspector={inspector}
      actionPredicate={actionPredicate}
      showShadow={showShadow}
      showBadges={false}
      showNotifications={false}
      theme={theme}
    />
  );
};
