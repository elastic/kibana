/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLO_RESOURCES_VERSION } from '../../../common/constants';

export const getSLOPipelineTemplate = (id: string, indexNamePrefix: string) => ({
  id,
  description: 'Ingest pipeline for SLO rollup data',
  processors: [
    {
      set: {
        field: 'event.ingested',
        value: '{{{_ingest.timestamp}}}',
      },
    },
    {
      date_index_name: {
        field: '@timestamp',
        index_name_prefix: indexNamePrefix,
        date_rounding: 'M',
        date_formats: ['UNIX_MS', 'ISO8601', "yyyy-MM-dd'T'HH:mm:ss.SSSXX"],
      },
    },
    {
      script: {
        description: 'Generated the instanceId field for SLO rollup data',
        source: `
        // This function will recursively collect all the values of a HashMap of HashMaps
        Collection collectValues(HashMap subject) {
          Collection values = new ArrayList();
          // Iterate through the values
          for(Object value: subject.values()) {
            // If the value is a HashMap, recurse
            if (value instanceof HashMap) {
              values.addAll(collectValues((HashMap) value));
            } else {
              values.add(String.valueOf(value));
            } 
          }
          return values;
        }

        // Create the string builder
        StringBuilder instanceId = new StringBuilder();

        if (ctx["slo"]["groupings"] == null) {
          ctx["slo"]["instanceId"] = "*";
        } else {
          // Get the values as a collection
          Collection values = collectValues(ctx["slo"]["groupings"]);

          // Convert to a list and sort
          List sortedValues = new ArrayList(values);
          Collections.sort(sortedValues);

          // Create comma delimited string
          for(String instanceValue: sortedValues) {
            instanceId.append(instanceValue);
            instanceId.append(",");
          }

            // Assign the slo.instanceId
          ctx["slo"]["instanceId"] = instanceId.length() > 0 ? instanceId.substring(0, instanceId.length() - 1) : "*";
        }
       `,
      },
    },
  ],
  _meta: {
    description: 'Ingest pipeline for SLO rollup data',
    version: SLO_RESOURCES_VERSION,
    managed: true,
    managed_by: 'observability',
  },
});
