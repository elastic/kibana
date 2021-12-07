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

export const loadTags = () => {
  const tags = require('./tag.security_solution').securitySolutionTags;
  return tags;
};

export async function initializeTemplates(
  client: Pick<SavedObjectsRepository, 'bulkCreate' | 'create' | 'find' | 'get'>
) {
  // try {
  //   existingTag = await client.get('tag', hardCodedTagId);
  // } catch (e) {
  //   if (existingTag == null) {

  //     client.create('tag', tagTemplate, { id: hardCodedTagId }).catch((err) => {});
  //   }
  // }

  for (const tag of loadTags()) {
    let existingTag = null;

    try {
      existingTag = await client.get('tag', tag.id);
    } catch (e) {
      console.log(e);
      if (existingTag == null) {
        const { id, ...tagToCreate } = tag;
        await client
          .create('tag', tagToCreate, { id })
          .then(() => {
            console.log(`creating ${id}: ${tagToCreate.name}`);
          })
          .catch((err) => {});
      }
    }
  }

  // if (existingTemplates.total === 0) {
  // Some devs were seeing timeouts that would cause an unhandled promise rejection
  // likely because the pitch template is so huge.
  // So, rather than doing a bulk create of templates, we're going to fire off individual
  // creates and catch and throw-away any errors that happen.
  // Once packages are ready, we should probably move that pitch that is so large to a package
  for (const template of loadTemplates()) {
    let existingTemplate = null;

    try {
      existingTemplate = await client.get('lens', template.id);
    } catch (e) {
      console.log(e);
      if (existingTemplate == null) {
        const { id, references, ...templateToCreate } = template;
        await client
          .create('lens', templateToCreate, {
            /* hard coded reference here atm, please update this before use*/
            references,
            id,
          })
          .then(() => {
            console.log(`creating ${id}: ${templateToCreate.name}`);
          })
          .catch((err) => {
            console.log('creattion error----', err);
          });
      }
    }
  }
}
