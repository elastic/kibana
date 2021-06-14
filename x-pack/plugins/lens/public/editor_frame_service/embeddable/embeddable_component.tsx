/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { CoreStart } from 'kibana/public';
import { UiActionsStart } from 'src/plugins/ui_actions/public';
import type { Start as InspectorStartContract } from 'src/plugins/inspector/public';
import {
  ACTION_EXPORT_CSV,
  ACTION_INSPECT_PANEL,
  EmbeddableInput,
  EmbeddableOutput,
  EmbeddablePanel,
  EmbeddableRoot,
  EmbeddableStart,
  IEmbeddable,
  useEmbeddableFactory,
} from '../../../../../../src/plugins/embeddable/public';
import type { LensByReferenceInput, LensByValueInput } from './embeddable';
import type { Document } from '../../persistence';
import type { IndexPatternPersistedState } from '../../indexpattern_datasource/types';
import type { XYState } from '../../xy_visualization/types';
import type { PieVisualizationState } from '../../pie_visualization/types';
import type { DatatableVisualizationState } from '../../datatable_visualization/visualization';
import type { MetricState } from '../../metric_visualization/types';

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

const actionToTrigger = {
  inspector: ACTION_INSPECT_PANEL,
  download: ACTION_EXPORT_CSV,
} as const;

export type FilterableActions = keyof typeof actionToTrigger;
type ActionsOriginalId = typeof actionToTrigger[FilterableActions];

function getActionsIdFromNames(actions: Partial<Record<FilterableActions, boolean>>) {
  return Object.keys(actions).reduce(
    (lookup, action) => ({
      ...lookup,
      [actionToTrigger[action as FilterableActions]]: (actions as Record<
        FilterableActions,
        boolean
      >)[action as FilterableActions],
    }),
    {} as Record<ActionsOriginalId, boolean>
  );
}

/**
 * Type-safe variant of by value embeddable input for Lens.
 * This can be used to hardcode certain Lens chart configurations within another app.
 */
export type TypedLensByValueInput = Omit<LensByValueInput, 'attributes'> & {
  attributes:
    | LensAttributes<'lnsXY', XYState>
    | LensAttributes<'lnsPie', PieVisualizationState>
    | LensAttributes<'lnsDatatable', DatatableVisualizationState>
    | LensAttributes<'lnsMetric', MetricState>;
};

export type EmbeddableComponentProps = (TypedLensByValueInput | LensByReferenceInput) & {
  actions?: boolean | Partial<Record<FilterableActions, boolean>>;
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
    const [embeddable, loading, error] = useEmbeddableFactory({ factory, input: props });
    const hasActions = !props.actions || Object.keys(props.actions || {}).length > 0;
    const filterActions = useCallback(
      (actionId: string) => {
        if (props.actions == null || typeof props.actions === 'boolean') {
          return Boolean(props.actions);
        }
        const actionsToId = getActionsIdFromNames(props.actions);
        return actionId in actionsToId && actionsToId[actionId as ActionsOriginalId];
      },
      [props.actions]
    );
    if (!hasActions || loading || error || !embeddable) {
      return (
        <EmbeddableRoot embeddable={embeddable} loading={loading} error={error} input={props} />
      );
    }
    return (
      <EmbeddablePanel
        hideHeader={false}
        embeddable={embeddable as IEmbeddable<EmbeddableInput, EmbeddableOutput>}
        getActions={uiActions.getTriggerCompatibleActions}
        inspector={inspector}
        filterActions={filterActions}
      />
    );
  };
}
