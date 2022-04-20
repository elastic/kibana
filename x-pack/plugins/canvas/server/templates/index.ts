/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsRepository } from '@kbn/core/server';

import { TEMPLATE_TYPE } from '../../common/lib/constants';

// only load templates when requested to reduce require() cost on startup
export function loadTemplates() {
  return [
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('./pitch_presentation').pitch,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('./status_report').status,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('./summary_report').summary,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('./theme_dark').dark,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('./theme_light').light,
  ];
}

export async function initializeTemplates(
  client: Pick<SavedObjectsRepository, 'bulkCreate' | 'create' | 'find'>
) {
  const existingTemplates = await client.find({ type: TEMPLATE_TYPE, perPage: 1 });

  if (existingTemplates.total === 0) {
    // Some devs were seeing timeouts that would cause an unhandled promise rejection
    // likely because the pitch template is so huge.
    // So, rather than doing a bulk create of templates, we're going to fire off individual
    // creates and catch and throw-away any errors that happen.
    // Once packages are ready, we should probably move that pitch that is so large to a package
    for (const template of loadTemplates()) {
      client.create(TEMPLATE_TYPE, template, { id: template.id }).catch((err) => undefined);
    }
  }
}
