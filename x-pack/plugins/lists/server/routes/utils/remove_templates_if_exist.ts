/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ListClient } from '../../services/lists/list_client';

export const removeLegacyTemplatesIfExist = async (lists: ListClient): Promise<void> => {
  try {
    const legacyTemplateExists = await lists.getLegacyListTemplateExists();
    const legacyTemplateListItemsExists = await lists.getLegacyListItemTemplateExists();

    // Check if the old legacy lists and items template exists and remove it
    if (legacyTemplateExists) {
      await lists.deleteLegacyListTemplate();
    }
    if (legacyTemplateListItemsExists) {
      await lists.deleteLegacyListItemTemplate();
    }
  } catch (err) {
    // 410 error is for ES serverless, this API doesn't exist there any more, so _template request returns 410 error
    if (err.statusCode !== 404 && err.statusCode !== 410) {
      throw err;
    }
  }
};
