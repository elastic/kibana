/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsRepository } from 'src/core/server';
import { MATRIX_HISTOGRAM_TEMPLATE_TYPE } from '../../common/constants';

// only load templates when requested to reduce require() cost on startup
export function loadTemplates() {
  return [
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('./host.name').hostName,
  ];
}

export async function initializeTemplates(
  client: Pick<SavedObjectsRepository, 'bulkCreate' | 'create' | 'find' | 'get'>
) {
  const hardCodedTagId = '6853a880-5451-11ec-b0fd-2f7a10a18ba6';
  const hardCodedTemplateId = '6853a880-5451-99ec-b0fd-2f7a10a18ba6';
  let existingTag = null;
  let existingTemplate = null;
  try {
    existingTag = await client.get('tag', hardCodedTagId);
  } catch (e) {
    if (existingTag == null) {
      const tagTemplate = require('./tag.security_solution').securitySolution;
      client.create('tag', tagTemplate, { id: hardCodedTagId }).catch((err) => {});
    }
  }

  // if (existingTemplates.total === 0) {
  // Some devs were seeing timeouts that would cause an unhandled promise rejection
  // likely because the pitch template is so huge.
  // So, rather than doing a bulk create of templates, we're going to fire off individual
  // creates and catch and throw-away any errors that happen.
  // Once packages are ready, we should probably move that pitch that is so large to a package
  for (const template of loadTemplates()) {
    try {
      existingTemplate = await client.get('lens', hardCodedTemplateId);
    } catch (e) {
      console.log(e);
      if (existingTemplate == null) {
        const templateToCreate = require('./host.name').securitySolution;
        client
          .create('lens', templateToCreate, {
            /* hard coded reference here atm, please update this before use*/
            references: [
              {
                type: 'index-pattern',
                id: 'security-solution-default',
                name: 'indexpattern-datasource-current-indexpattern',
              },
              {
                type: 'index-pattern',
                id: 'security-solution-default',
                name: 'indexpattern-datasource-layer-f6172bed-07e8-48fc-b9e4-2291fe061aed',
              },
              {
                type: 'tag',
                id: '6853a880-5451-11ec-b0fd-2f7a10a18ba6',
                name: 'tag-ref-6853a880-5451-11ec-b0fd-2f7a10a18ba6',
              },
            ],
            id: hardCodedTemplateId,
          })
          .catch((err) => {
            console.log('creattion error----', err);
          });
      }
    }
  }
}
