/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createGetterSetter } from '@kbn/kibana-utils-plugin/common';
import type { CoreStart } from '@kbn/core/public';
import type {
  EmbeddableFactory,
  EmbeddableInput,
  IEmbeddable,
} from '@kbn/embeddable-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { Datasource, Visualization } from '../../types';
import type { LensPluginStartDependencies } from '../../plugin';
import { fetchDataFromAggregateQuery } from '../../datasources/text_based/fetch_data_from_aggregate_query';
import { suggestionsApi } from '../../lens_suggestions_api';
import { getLensAttributes } from '../../app_plugin/shared/edit_on_the_fly/helpers';
import { generateId } from '../../id_generator';
import { executeEditAction } from './edit_action_helpers';

// datasourceMap and visualizationMap setters/getters
export const [getVisualizationMap, setVisualizationMap] = createGetterSetter<
  Record<string, Visualization<unknown, unknown, unknown>>
>('VisualizationMap', false);

export const [getDatasourceMap, setDatasourceMap] = createGetterSetter<
  Record<string, Datasource<unknown, unknown>>
>('DatasourceMap', false);

export function isCreateActionCompatible(core: CoreStart) {
  return core.uiSettings.get('discover:enableESQL');
}

export async function executeCreateAction({
  deps,
  core,
  createNewEmbeddable,
  deleteEmbeddable,
}: {
  deps: LensPluginStartDependencies;
  core: CoreStart;
  createNewEmbeddable: (
    embeddableFactory: EmbeddableFactory,
    initialInput?: Partial<EmbeddableInput>,
    dismissNotification?: boolean
  ) => Promise<undefined | IEmbeddable>;
  deleteEmbeddable: (embeddableId: string) => void;
}) {
  const isCompatibleAction = isCreateActionCompatible(core);
  const defaultDataView = await deps.dataViews.getDefaultDataView({
    displayErrors: false,
  });
  if (!isCompatibleAction || !defaultDataView) {
    throw new IncompatibleActionError();
  }
  const visualizationMap = getVisualizationMap();
  const datasourceMap = getDatasourceMap();

  const defaultIndex = defaultDataView.getIndexPattern();
  const defaultEsqlQuery = {
    esql: `from ${defaultIndex} | limit 10`,
  };

  // For the suggestions api we need only the columns
  // so we are requesting them with limit 0
  // this is much more performant than requesting
  // all the table
  const performantQuery = {
    esql: `from ${defaultIndex} | limit 0`,
  };

  const table = await fetchDataFromAggregateQuery(
    performantQuery,
    defaultDataView,
    deps.data,
    deps.expressions
  );

  const context = {
    dataViewSpec: defaultDataView.toSpec(),
    fieldName: '',
    textBasedColumns: table?.columns,
    query: defaultEsqlQuery,
  };

  // get the initial attributes from the suggestions api
  const allSuggestions =
    suggestionsApi({ context, dataView: defaultDataView, datasourceMap, visualizationMap }) ?? [];

  // Lens might not return suggestions for some cases, i.e. in case of errors
  if (!allSuggestions.length) return undefined;
  const [firstSuggestion] = allSuggestions;
  const attrs = getLensAttributes({
    filters: [],
    query: defaultEsqlQuery,
    suggestion: firstSuggestion,
    dataView: defaultDataView,
  });

  const input = {
    attributes: attrs,
    id: generateId(),
  };
  const embeddableStart = deps.embeddable;
  const factory = embeddableStart.getEmbeddableFactory('lens');
  if (!factory) {
    return undefined;
  }
  const embeddable = await createNewEmbeddable(factory, input, true);
  // open the flyout if embeddable has been created successfully
  if (embeddable) {
    const deletePanel = () => {
      deleteEmbeddable(embeddable.id);
    };

    executeEditAction({
      embeddable,
      startDependencies: deps,
      overlays: core.overlays,
      theme: core.theme,
      isNewPanel: true,
      deletePanel,
    });
  }
}
