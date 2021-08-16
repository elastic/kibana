/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, KibanaRequest } from 'kibana/server';
import {
  pie,
  xyChart,
  timeScale,
  counterRate,
  metricChart,
  yAxisConfig,
  layerConfig,
  formatColumn,
  legendConfig,
  renameColumns,
  gridlinesConfig,
  datatableColumn,
  tickLabelsConfig,
  axisTitlesVisibilityConfig,
  getDatatable,
} from '../../common/expressions';
import type { PluginStartContract } from '../plugin';
import type {
  ExecutionContext,
  ExpressionsServerSetup,
} from '../../../../../src/plugins/expressions/server';

const getUiSettings = (coreStart: CoreStart, kibanaRequest: KibanaRequest) =>
  coreStart.uiSettings.asScopedToClient(coreStart.savedObjects.getScopedClient(kibanaRequest));

export const setupExpressions = (
  core: CoreSetup<PluginStartContract>,
  expressions: ExpressionsServerSetup
) => {
  const getFormatFactory = async (context: ExecutionContext) => {
    const [coreStart, { fieldFormats: fieldFormatsStart }] = await core.getStartServices();
    const kibanaRequest = context.getKibanaRequest?.();

    if (!kibanaRequest) {
      throw new Error('"lens_datatable" expression function requires a KibanaRequest to execute');
    }

    const fieldFormats = await fieldFormatsStart.fieldFormatServiceFactory(
      getUiSettings(coreStart, kibanaRequest)
    );

    return fieldFormats.deserialize;
  };

  [
    pie,
    xyChart,
    timeScale,
    counterRate,
    metricChart,
    yAxisConfig,
    layerConfig,
    formatColumn,
    legendConfig,
    renameColumns,
    gridlinesConfig,
    datatableColumn,
    tickLabelsConfig,
    axisTitlesVisibilityConfig,
    getDatatable(getFormatFactory),
  ].forEach((expressionFn) => expressions.registerFunction(expressionFn));
};
