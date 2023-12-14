/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SpaceDataStream } from '@kbn/data-stream';
import { ecsFieldMap } from '@kbn/data-stream/ecs';
import { resultsFieldMap } from './results_field_map';

const TOTAL_FIELDS_LIMIT = 2500;

export const RESULTS_DATA_STREAM_NAME = '.kibana-dqa-dashboard-results';

const RESULTS_INDEX_TEMPLATE_NAME = '.kibana-dqa-dashboard-results-index-template';
const RESULTS_COMPONENT_TEMPLATE_NAME = '.kibana-dqa-dashboard-results-mappings';
const ECS_COMPONENT_TEMPLATE_NAME = '.kibana-dqa-dashboard-ecs-mappings';

export type CreateResultsDataStream = (params: {
  kibanaVersion: string;
  namespace?: string;
}) => SpaceDataStream;

export const createResultsDataStream: CreateResultsDataStream = ({ kibanaVersion }) => {
  const resultsDataStream = new SpaceDataStream(RESULTS_DATA_STREAM_NAME, {
    kibanaVersion,
    totalFieldsLimit: TOTAL_FIELDS_LIMIT,
  });

  resultsDataStream.setComponentTemplate({
    name: ECS_COMPONENT_TEMPLATE_NAME,
    fieldMap: ecsFieldMap,
  });
  resultsDataStream.setComponentTemplate({
    name: RESULTS_COMPONENT_TEMPLATE_NAME,
    fieldMap: resultsFieldMap,
  });

  resultsDataStream.setIndexTemplate({
    name: RESULTS_INDEX_TEMPLATE_NAME,
    componentTemplateRefs: [RESULTS_COMPONENT_TEMPLATE_NAME, ECS_COMPONENT_TEMPLATE_NAME],
    template: {
      lifecycle: {
        data_retention: '90d',
      },
    },
  });

  return resultsDataStream;
};
