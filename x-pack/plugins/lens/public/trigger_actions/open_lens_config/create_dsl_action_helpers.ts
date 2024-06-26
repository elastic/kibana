/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';
import { getLensAttributesFromSuggestion } from '@kbn/visualization-utils';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { PresentationContainer } from '@kbn/presentation-containers';
import type { LensPluginStartDependencies } from '../../plugin';
import { ChartType, suggestionsApi } from '../../lens_suggestions_api';
import { generateId } from '../../id_generator';
import { executeEditAction } from './edit_action_helpers';
import { Embeddable } from '../../embeddable';
import { DOCUMENT_FIELD_NAME } from '../../../common';

const getAsyncHelpers = async () => await import('../../async_services');

export async function executeCreateDSLAction({
  deps,
  core,
  api,
}: {
  deps: LensPluginStartDependencies;
  core: CoreStart;
  api: PresentationContainer;
}) {
  const { getVisualizationMap, getDatasourceMap } = await getAsyncHelpers();

  const dataView = await deps.dataViews.getDefaultDataView();

  if (!dataView) {
    throw new IncompatibleActionError();
  }
  const visualizationMap = getVisualizationMap();
  const datasourceMap = getDatasourceMap();

  const context = {
    dataViewSpec: dataView.toSpec(false),
    fieldName: dataView.timeFieldName ?? DOCUMENT_FIELD_NAME,
    contextualFields: [],
  };

  // get the initial attributes from the suggestions api
  const allSuggestions =
    suggestionsApi({
      context,
      dataView,
      datasourceMap,
      visualizationMap,
      preferredChartType: dataView.timeFieldName ? ChartType.XY : undefined,
    }) ?? [];

  // Lens might not return suggestions for some cases, i.e. in case of errors
  if (!allSuggestions.length) return undefined;
  const [firstSuggestion] = allSuggestions;
  const attrs = getLensAttributesFromSuggestion({
    filters: [],
    suggestion: firstSuggestion,
    dataView,
    query: {
      query: '',
      language: 'kuery',
    },
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
