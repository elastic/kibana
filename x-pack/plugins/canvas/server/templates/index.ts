/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsRepository } from 'src/core/server';
import { pitch } from './pitch_presentation';
import { status } from './status_report';
import { summary } from './summary_report';
import { dark } from './theme_dark';
import { light } from './theme_light';

import { TEMPLATE_TYPE } from '../../common/lib/constants';

export const templates = [status, summary, dark, light, pitch];

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
    for (const template of templates) {
      client.create(TEMPLATE_TYPE, template, { id: template.id }).catch((err) => undefined);
    }
  }
}
