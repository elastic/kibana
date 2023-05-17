/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesGetIndexTemplateResponse } from '@elastic/elasticsearch/lib/api/types';
import { getDefaultIndexTemplateNames } from '../../../../common/diagnostics/get_default_index_template_names';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

export function transformResponse(
  existingIndexTemplates: IndicesGetIndexTemplateResponse
) {
  const defaultIndexTemplateNames = getDefaultIndexTemplateNames();
  const existingIndexTemplatesNames =
    existingIndexTemplates.index_templates.map(
      (indexTemplate) => indexTemplate.name
    );

  return defaultIndexTemplateNames.reduce<
    Record<string, { exists: boolean; name?: string }>
  >((acc, defaultIndexTemplateName) => {
    // the actual index template name must have the same prefix as the default index template name
    const existingIndexTemplateName = existingIndexTemplatesNames.find((name) =>
      name.startsWith(defaultIndexTemplateName)
    );

    acc[defaultIndexTemplateName] = {
      exists: existingIndexTemplateName !== undefined,
      name: existingIndexTemplateName,
    };
    return acc;
  }, {});
}

export async function getDefaultApmIndexTemplateStates(
  apmEventClient: APMEventClient
) {
  const existingIndexTemplates = await apmEventClient.indexTemplate(
    'diagnostics_index_templates',
    { name: '*-apm.*' }
  );

  return transformResponse(existingIndexTemplates);
}
