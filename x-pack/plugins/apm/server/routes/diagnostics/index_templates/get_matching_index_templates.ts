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

type ExpectedIndexTemplateStates = Record<
  string,
  { exists: boolean; name?: string | undefined }
>;

export async function getMatchingIndexTemplates(
  apmEventClient: APMEventClient,
  expectedIndexTemplateStates: ExpectedIndexTemplateStates
) {
  const apmIndexPatterns = getUniqueApmIndices(apmEventClient.indices);
  const matchingIndexTemplates = await Promise.all(
    apmIndexPatterns.map(async (indexPattern) => {
      const simulateResponse = await apmEventClient.simulateIndexTemplate(
        'simulate_index_template',
        { index_patterns: [indexPattern] }
      );

      const indexTemplates = await Promise.all(
        (simulateResponse.overlapping ?? []).map(
          async ({
            index_patterns: templateIndexPatterns,
            name: templateName,
          }) => {
            const priority = await getTemplatePriority(
              apmEventClient,
              templateName
            );

            const isNonStandard = getIsNonStandardIndexTemplate(
              expectedIndexTemplateStates,
              templateName
            );

            return {
              priority,
              templateIndexPatterns,
              templateName,
              isNonStandard,
            };
          }
        )
      );

      return {
        indexPattern,
        indexTemplates: orderBy(
          indexTemplates,
          ({ priority }) => priority,
          'desc'
        ),
      };
    })
  );

  return matchingIndexTemplates;
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

function getIsNonStandardIndexTemplate(
  expectedIndexTemplateStates: ExpectedIndexTemplateStates,
  templateName: string
) {
  const expectedIndexTemplates = Object.keys(expectedIndexTemplateStates);

  const defaultXpackIndexTemplates = ['logs', 'metrics'];
  const isNonStandard = [
    ...expectedIndexTemplates,
    ...defaultXpackIndexTemplates,
  ].every((expectedIndexTemplate) => {
    const notMatch = !templateName.startsWith(expectedIndexTemplate);
    return notMatch;
  });

  return isNonStandard;
}
