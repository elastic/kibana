/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createGetterSetter } from '@kbn/kibana-utils-plugin/common';
import type { CoreStart } from '@kbn/core/public';
import { getLensAttributesFromSuggestion } from '@kbn/visualization-utils';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { PresentationContainer } from '@kbn/presentation-containers';
import {
  getESQLAdHocDataview,
  getIndexForESQLQuery,
  ENABLE_ESQL,
  getESQLQueryColumns,
} from '@kbn/esql-utils';
import type { Datasource, Visualization } from '../../types';
import type { LensPluginStartDependencies } from '../../plugin';
import { suggestionsApi } from '../../lens_suggestions_api';
import { generateId } from '../../id_generator';
import { executeEditAction } from './edit_action_helpers';
import { Embeddable } from '../../embeddable';

// datasourceMap and visualizationMap setters/getters
export const [getVisualizationMap, setVisualizationMap] = createGetterSetter<
  Record<string, Visualization<unknown, unknown, unknown>>
>('VisualizationMap', false);

export const [getDatasourceMap, setDatasourceMap] = createGetterSetter<
  Record<string, Datasource<unknown, unknown>>
>('DatasourceMap', false);

export function isCreateActionCompatible(core: CoreStart) {
  return core.uiSettings.get(ENABLE_ESQL);
}

export async function executeCreateAction({
  deps,
  core,
  api,
}: {
  deps: LensPluginStartDependencies;
  core: CoreStart;
  api: PresentationContainer;
}) {
  const isCompatibleAction = isCreateActionCompatible(core);

  const getFallbackDataView = async () => {
    const indexName = await getIndexForESQLQuery({ dataViews: deps.dataViews });
    if (!indexName) return null;
    const dataView = await getESQLAdHocDataview(indexName, deps.dataViews);
    return dataView;
  };

  const dataView = await getFallbackDataView();

  if (!isCompatibleAction || !dataView) {
    throw new IncompatibleActionError();
  }
  const visualizationMap = getVisualizationMap();
  const datasourceMap = getDatasourceMap();
  const defaultIndex = dataView.getIndexPattern();

  const defaultEsqlQuery = {
    esql: `from ${defaultIndex} | limit 10`,
  };

  // For the suggestions api we need only the columns
  // so we are requesting them with limit 0
  // this is much more performant than requesting
  // all the table
  const abortController = new AbortController();
  const columns = await getESQLQueryColumns({
    esqlQuery: `from ${defaultIndex}`,
    search: deps.data.search.search,
    signal: abortController.signal,
  });

  const context = {
    dataViewSpec: dataView.toSpec(),
    fieldName: '',
    textBasedColumns: columns,
    query: defaultEsqlQuery,
  };

  // get the initial attributes from the suggestions api
  const allSuggestions =
    suggestionsApi({ context, dataView, datasourceMap, visualizationMap }) ?? [];

  // Lens might not return suggestions for some cases, i.e. in case of errors
  if (!allSuggestions.length) return undefined;
  const [firstSuggestion] = allSuggestions;
  const attrs = getLensAttributesFromSuggestion({
    filters: [],
    query: defaultEsqlQuery,
    suggestion: firstSuggestion,
    dataView,
  });

  const embeddable = await api.addNewPanel<object, Embeddable>({
    panelType: 'lens',
    initialState: {
      attributes: attrs,
      id: generateId(),
    },
  });
  // open the flyout if embeddable has been created successfully
  if (embeddable) {
    const deletePanel = () => {
      api.removePanel(embeddable.id);
    };

    executeEditAction({
      embeddable,
      startDependencies: deps,
      isNewPanel: true,
      deletePanel,
      ...core,
    });
  }
}
