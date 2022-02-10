/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { createMetricQuery } from './saved_objects_metric_factory';
import { LensMultitermsUsage } from './types';

export async function getMultitermsCounts(
  getEsClient: () => Promise<ElasticsearchClient>,
  kibanaIndex: string
): Promise<LensMultitermsUsage> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function bucketsToObject(arg: any) {
    const obj: Record<string, number> = {};
    if (arg.multitermsDocs.doc_count > 0) {
      obj.multiterms_docs = arg.multitermsDocs.doc_count;
      obj.multiterms_terms_count = arg.multitermsTermsCount.value;
      obj.multiterms_operations_count = arg.multitermsOperationsCount.value;
    }
    return obj;
  }

  const forEachMultitermsOperationScript = (operationToApply: string) => {
    return `
      try {
          if(doc['lens.state'].size() == 0) return;
          HashMap layers = params['_source'].get('lens').get('state').get('datasourceStates').get('indexpattern').get('layers');
          for(layerId in layers.keySet()) {
              HashMap columns = layers.get(layerId).get('columns');
              for(columnId in columns.keySet()) {
                  if(columns.get(columnId).get('operationType') == 'terms'){
                      if(columns.get(columnId).get('params').get('secondaryFields').size() > 0){
                          ${operationToApply}
                      }
                  }
              }
          }
      } catch(Exception e) {}`;
  };

  const fn = createMetricQuery(getEsClient, kibanaIndex);

  const result = await fn({
    aggregations: {
      multitermsOperationsCount: {
        sum: {
          field: 'multiterms_operations_count',
        },
      },
      multitermsTermsCount: {
        sum: {
          field: 'multiterms_count',
        },
      },
      multitermsDocs: {
        filter: {
          match: {
            operation_type: 'multiterms',
          },
        },
      },
    },
    runtimeMappings: {
      operation_type: {
        type: 'keyword',
        script: {
          lang: 'painless',
          source: forEachMultitermsOperationScript("emit('multiterms');"),
        },
      },
      multiterms_count: {
        type: 'double',
        script: {
          lang: 'painless',
          source: `
            double terms = 0;
            ${forEachMultitermsOperationScript(
              "terms += columns.get(columnId).get('params').get('secondaryFields').size() + 1;"
            )}
            emit(terms);`,
        },
      },
      multiterms_operations_count: {
        type: 'double',
        script: {
          lang: 'painless',
          source: `
          double operations = 0;
          ${forEachMultitermsOperationScript('operations += 1;')}
          emit(operations);`,
        },
      },
    },
    bucketsToObject,
  });
  // remap the result with the multiterms shape
  return {
    saved_multiterms_overall: result.saved_overall,
    saved_multiterms_30_days: result.saved_30_days,
    saved_multiterms_90_days: result.saved_90_days,
  };
}
