/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSavedObjectsClient } from '../../../util/dependency_cache';
import { KibanaObjects } from './page';

/**
 * Gets kibana objects with an existence check.
 */
export const checkForSavedObjects = async (objects: KibanaObjects): Promise<KibanaObjects> => {
  const savedObjectsClient = getSavedObjectsClient();
  try {
    return await Object.keys(objects).reduce(async (prevPromise, type) => {
      const acc = await prevPromise;
      const { savedObjects } = await savedObjectsClient.find<any>({
        type,
        perPage: 1000,
      });

      acc[type] = objects[type].map((obj) => {
        const find = savedObjects.find((savedObject) => savedObject.attributes.title === obj.title);
        return {
          ...obj,
          exists: !!find,
          id: (!!find && find.id) || obj.id,
        };
      });
      return Promise.resolve(acc);
    }, Promise.resolve({} as KibanaObjects));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Could not load saved objects', e);
  }
  return Promise.resolve(objects);
};
