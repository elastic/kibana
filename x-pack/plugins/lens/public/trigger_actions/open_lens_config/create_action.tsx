/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { Action } from '@kbn/ui-actions-plugin/public';
import type { LensPluginStartDependencies } from '../../plugin';
import { fetchDataFromAggregateQuery } from '../../datasources/text_based/fetch_data_from_aggregate_query';
import { suggestionsApi } from '../../lens_suggestions_api';

// import { isLensEmbeddable } from '../utils';

const ACTION_CREATE_ESQL_CHART = 'ACTION_CREATE_ESQL_CHART';

export const getAsyncHelpers = async () => await import('../../async_services');

export class CreateESQLPanelAction implements Action<{}> {
  public type = ACTION_CREATE_ESQL_CHART;
  public id = ACTION_CREATE_ESQL_CHART;
  public order = 50;

  constructor(
    protected readonly startDependencies: LensPluginStartDependencies,
    protected readonly core: CoreStart
  ) {}

  public getDisplayName(): string {
    return i18n.translate('xpack.lens.app.createVisualizationLabel', {
      defaultMessage: 'ES|QL',
    });
  }

  public getIconType() {
    // need to create a new one
    return 'tableDensityExpanded';
  }

  public async isCompatible() {
    // check the UI setting value here
    return true;
  }

  public async execute() {
    const { getVisualizationMap, getDatasourceMap } = await getAsyncHelpers();
    const visualizationMap = getVisualizationMap();
    const datasourceMap = getDatasourceMap();
    // const embeddableStart = this.startDependencies.embeddable;
    // const factory = embeddableStart.getEmbeddableFactory('lens')!;
    // console.dir(this.startDependencies);
    const defaultDataView = await this.startDependencies.dataViews.getDefaultDataView({
      displayErrors: false,
    });
    if (!defaultDataView) {
      return undefined;
    }
    const defaultEsqlQuery = {
      esql: `from ${defaultDataView?.getIndexPattern()} | limit 10`,
    };

    const performantQuery = {
      esql: `from ${defaultDataView?.getIndexPattern()} | limit 0`,
    };

    const table = await fetchDataFromAggregateQuery(
      performantQuery,
      defaultDataView,
      this.startDependencies.data,
      this.startDependencies.expressions
    );

    const context = {
      dataViewSpec: defaultDataView?.toSpec(),
      fieldName: '',
      textBasedColumns: table?.columns,
      query: defaultEsqlQuery,
    };

    const allSuggestions =
      suggestionsApi({ context, dataView: defaultDataView, datasourceMap, visualizationMap }) ?? [];

    // Lens might not return suggestions for some cases, i.e. in case of errors
    if (!allSuggestions.length) return undefined;

    // get the initial attributes from the suggestions api
    // create a new embeddable with factory.create
    // factory?.create()
  }
}
