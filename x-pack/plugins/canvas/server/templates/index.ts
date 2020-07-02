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

export const templates = [pitch, status, summary, dark, light];

export async function initializeTemplates(
  client: Pick<SavedObjectsRepository, 'bulkCreate' | 'find'>
) {
  const existingTemplates = await client.find({ type: TEMPLATE_TYPE, perPage: 1 });

  if (existingTemplates.total === 0) {
    const templateObjects = templates.map((template) => ({
      id: template.id,
      type: TEMPLATE_TYPE,
      attributes: template,
    }));

    client.bulkCreate(templateObjects);
  }
}
