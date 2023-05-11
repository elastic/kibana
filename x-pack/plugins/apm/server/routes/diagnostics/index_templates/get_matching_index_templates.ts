/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy, uniq } from 'lodash';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

export function getUniqueApmIndices(indices: APMEventClient['indices']) {
  return uniq(
    Object.values(indices).flatMap((index): string[] => index.split(','))
  );
}

export async function getMatchingIndexTemplates(
  apmEventClient: APMEventClient
) {
  const apmIndexPatterns = getUniqueApmIndices(apmEventClient.indices);
  const matchingTemplates = await Promise.all(
    apmIndexPatterns.map(async (indexPattern) => {
      const simulateResponse = await apmEventClient.simulateIndexTemplate(
        'simulate_index_template',
        {
          index_patterns: [indexPattern],
        }
      );

      const overlappingTemplates = await Promise.all(
        (simulateResponse.overlapping ?? []).map(
          async ({ index_patterns: templateIndexPatterns, name }) => {
            const priority = await getTemplatePriority(apmEventClient, name);

            return {
              priority,
              templateIndexPatterns,
              name,
            };
          }
        )
      );

      return {
        indexPattern,
        overlappingTemplates: orderBy(
          overlappingTemplates,
          ({ priority }) => priority,
          'desc'
        ),
      };
    })
  );

  return matchingTemplates;
}

async function getTemplatePriority(
  apmEventClient: APMEventClient,
  name: string
) {
  const res = await apmEventClient.indexTemplate(
    'get_index_template_priority',
    { name }
  );

  return res.index_templates[0].index_template.priority;
}
