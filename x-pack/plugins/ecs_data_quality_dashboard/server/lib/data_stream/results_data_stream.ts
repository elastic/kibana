/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStream } from '@kbn/data-stream';
import { ecsFieldMap } from '@kbn/data-stream/ecs';
import { resultsFieldMap } from './results_field_map';

export const TOTAL_FIELDS_LIMIT = 2500;
const ECS_COMPONENT_TEMPLATE_NAME = '.kibana-dqa-dashboard-ecs-mappings';
const RESULTS_COMPONENT_TEMPLATE_NAME = '.kibana-dqa-dashboard-results-mappings';
const INDEX_TEMPLATE_NAME = '.kibana-dqa-dashboard-index-template';

export type CreateResultsDataStream = (params: {
  kibanaVersion: string;
  space?: string;
}) => DataStream;

export const createResultsDataStream: CreateResultsDataStream = ({
  kibanaVersion,
  space = 'default',
}) => {
  const resultsDataStream = new DataStream(`.kibana-dqa-dashboard-${space}-results`, {
    kibanaVersion,
    totalFieldsLimit: TOTAL_FIELDS_LIMIT,
  });

  resultsDataStream.setComponentTemplate({
    name: ECS_COMPONENT_TEMPLATE_NAME,
    fieldMap: ecsFieldMap,
    includeSettings: true,
  });
  resultsDataStream.setComponentTemplate({
    name: RESULTS_COMPONENT_TEMPLATE_NAME,
    fieldMap: resultsFieldMap,
    includeSettings: true,
  });

  resultsDataStream.setIndexTemplate({
    name: INDEX_TEMPLATE_NAME,
    componentTemplateRefs: [RESULTS_COMPONENT_TEMPLATE_NAME, ECS_COMPONENT_TEMPLATE_NAME],
    namespace: space,
  });

  return resultsDataStream;
};
