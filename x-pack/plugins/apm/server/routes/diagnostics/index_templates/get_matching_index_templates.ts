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
    [indices.error, indices.metric, indices.span, indices.transaction].flatMap(
      (index): string[] => index.split(',')
    )
  );
}

type DefaultApmIndexTemplateStates = Record<
  string,
  { exists: boolean; name?: string | undefined }
>;

export async function getMatchingIndexTemplates(
  apmEventClient: APMEventClient,
  defaultApmIndexTemplateStates: DefaultApmIndexTemplateStates
) {
  const apmIndexPatterns = getUniqueApmIndices(apmEventClient.indices);
  const indexTemplatesByIndexPattern = await Promise.all(
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
              defaultApmIndexTemplateStates,
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

  return indexTemplatesByIndexPattern;
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
  defaultApmIndexTemplateStates: DefaultApmIndexTemplateStates,
  templateName: string
) {
  const defaultApmIndexTemplates = Object.keys(defaultApmIndexTemplateStates);
  const defaultXpackIndexTemplates = ['logs', 'metrics'];
  const isNonStandard = [
    ...defaultApmIndexTemplates,
    ...defaultXpackIndexTemplates,
  ].every((defaultApmIndexTemplate) => {
    const notMatch = !templateName.startsWith(defaultApmIndexTemplate);
    return notMatch;
  });

  return isNonStandard;
}
