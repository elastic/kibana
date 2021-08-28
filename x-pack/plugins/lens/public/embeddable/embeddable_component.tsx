/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLoadingChart } from '@elastic/eui';
import type { FC } from 'react';
import React, { useEffect } from 'react';
import type { CoreStart } from '../../../../../src/core/public/types';
import type { EmbeddableInput } from '../../../../../src/plugins/embeddable/common/types';
import { useEmbeddableFactory } from '../../../../../src/plugins/embeddable/public/lib/embeddables/embeddable_renderer';
import { EmbeddableRoot } from '../../../../../src/plugins/embeddable/public/lib/embeddables/embeddable_root';
import type {
  EmbeddableOutput,
  IEmbeddable,
} from '../../../../../src/plugins/embeddable/public/lib/embeddables/i_embeddable';
import { EmbeddablePanel } from '../../../../../src/plugins/embeddable/public/lib/panel/embeddable_panel';
import type { EmbeddableStart } from '../../../../../src/plugins/embeddable/public/plugin';
import type { Start as InspectorStartContract } from '../../../../../src/plugins/inspector/public/plugin';
import type { UiActionsStart } from '../../../../../src/plugins/ui_actions/public/plugin';
import type { MetricState } from '../../common/expressions/metric_chart/types';
import type { PieVisualizationState } from '../../common/expressions/pie_chart/types';
import type { DatatableVisualizationState } from '../datatable_visualization/visualization';
import type { IndexPatternPersistedState } from '../indexpattern_datasource/types';
import type { Document } from '../persistence/saved_object_store';
import type { XYState } from '../xy_visualization/types';
import type { LensByReferenceInput, LensByValueInput } from './embeddable';

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
    | LensAttributes<'lnsMetric', MetricState>;
};

export type EmbeddableComponentProps = (TypedLensByValueInput | LensByReferenceInput) & {
  withActions?: boolean;
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
    const hasActions = props.withActions === true;

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
        />
      );
    }

    return <EmbeddableRoot embeddable={embeddable} loading={loading} error={error} input={input} />;
  };
}

interface EmbeddablePanelWrapperProps {
  embeddable: IEmbeddable<EmbeddableInput, EmbeddableOutput>;
  uiActions: PluginsStartDependencies['uiActions'];
  inspector: PluginsStartDependencies['inspector'];
  actionPredicate: (id: string) => boolean;
  input: EmbeddableComponentProps;
}

const EmbeddablePanelWrapper: FC<EmbeddablePanelWrapperProps> = ({
  embeddable,
  uiActions,
  actionPredicate,
  inspector,
  input,
}) => {
  useEffect(() => {
    embeddable.updateInput(input);
  }, [embeddable, input]);

  return (
    <EmbeddablePanel
      hideHeader={false}
      embeddable={embeddable as IEmbeddable<EmbeddableInput, EmbeddableOutput>}
      getActions={uiActions.getTriggerCompatibleActions}
      inspector={inspector}
      actionPredicate={actionPredicate}
      showShadow={false}
      showBadges={false}
      showNotifications={false}
    />
  );
};
