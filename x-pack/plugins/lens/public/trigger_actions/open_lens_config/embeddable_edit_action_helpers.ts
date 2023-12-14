/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createGetterSetter } from '@kbn/kibana-utils-plugin/common';
import type { CoreStart } from '@kbn/core/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { type LensChartLoadEvent } from '@kbn/visualization-utils';
import type { Datasource, Visualization } from '../../types';
import type { LensPluginStartDependencies } from '../../plugin';
import { generateId } from '../../id_generator';
import { executeAction } from './helpers';
import type { TypedLensByValueInput } from '../../embeddable/embeddable_component';

// datasourceMap and visualizationMap setters/getters
export const [getVisualizationMap, setVisualizationMap] = createGetterSetter<
  Record<string, Visualization<unknown, unknown, unknown>>
>('VisualizationMap', false);

export const [getDatasourceMap, setDatasourceMap] = createGetterSetter<
  Record<string, Datasource<unknown, unknown>>
>('DatasourceMap', false);

export function isEmbeddableEditActionCompatible(core: CoreStart) {
  return core.uiSettings.get('discover:enableESQL');
}

export async function executeEditEmbeddableAction({
  deps,
  core,
  attributes,
  embeddableId,
  lensEvent,
  onUpdate,
  onApply,
}: {
  deps: LensPluginStartDependencies;
  core: CoreStart;
  attributes: TypedLensByValueInput['attributes'];
  embeddableId?: string;
  lensEvent?: LensChartLoadEvent;
  onUpdate?: (input: TypedLensByValueInput['attributes']) => void;
  onApply?: (input: TypedLensByValueInput['attributes']) => void;
}) {
  const isCompatibleAction = isEmbeddableEditActionCompatible(core);
  const defaultDataView = await deps.dataViews.getDefaultDataView({
    displayErrors: false,
  });
  if (!isCompatibleAction || !defaultDataView) {
    throw new IncompatibleActionError();
  }

  const input = {
    attributes,
    id: embeddableId ?? generateId(),
  };
  const embeddableStart = deps.embeddable;
  const factory = embeddableStart.getEmbeddableFactory('lens');
  if (!factory) {
    return undefined;
  }
  const embeddable = lensEvent?.embeddable ?? (await factory.create(input));
  // open the flyout if embeddable has been created successfully
  if (embeddable) {
    executeAction({
      embeddable,
      startDependencies: deps,
      overlays: core.overlays,
      theme: core.theme,
      onUpdate,
      onApply,
    });
  }
}
