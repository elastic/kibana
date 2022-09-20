/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core/server';
import { urlTemplatePlaceholder } from '../../common/constants';

export function prepareWorkplaceState(workplaceState: any, core: CoreSetup) {
  const extendedWorkplaceState = {
    ...workplaceState,
    urlTemplates: workplaceState.urlTemplates?.map((template: { url: string }) => ({
      ...template,
      url: core.http.basePath
        .prepend(template.url)
        .replace(encodeURIComponent(urlTemplatePlaceholder), urlTemplatePlaceholder),
    })),
  };

  return JSON.stringify(JSON.stringify(extendedWorkplaceState));
}
