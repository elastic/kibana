/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesGetIndexTemplateResponse } from '@elastic/elasticsearch/lib/api/types';
import { getDefaultIndexTemplateNames } from '../../../../common/diagnostics/get_default_index_template_names';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';

export function transformResponse(res: IndicesGetIndexTemplateResponse) {
  const defaultIndexTemplateNames = getDefaultIndexTemplateNames();
  const actualIndexTemplatesNames = res.index_templates.map(
    (indexTemplate) => indexTemplate.name
  );

  return defaultIndexTemplateNames.reduce<
    Record<string, { exists: boolean; name?: string }>
  >((acc, defaultIndexTemplateName) => {
    // the actual index template name must have the same prefix as the default index template name
    const actualIndexTemplateName = actualIndexTemplatesNames.find((name) =>
      name.startsWith(defaultIndexTemplateName)
    );

    acc[defaultIndexTemplateName] = {
      exists: !!actualIndexTemplateName,
      name: actualIndexTemplateName,
    };
    return acc;
  }, {});
}

export async function getExpectedIndexTemplateStates(
  apmEventClient: APMEventClient
) {
  const res = await apmEventClient.indexTemplate(
    'diagnostics_index_templates',
    { name: '*-apm.*' }
  );

  return transformResponse(res);
}
