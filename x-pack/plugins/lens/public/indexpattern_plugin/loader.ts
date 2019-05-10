/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import { Chrome } from 'ui/chrome';
import chrome from 'ui/chrome';

export const getIndexPatterns = () => {
  const savedObjectsClient = chrome.getSavedObjectsClient();
  return savedObjectsClient
    .find({
      type: 'index-pattern',
      perPage: 1000, // TODO: Paginate index patterns
    })
    .then(resp => {
      return resp.savedObjects.map(({ id, attributes }) => {
        return Object.assign(attributes, {
          id,
          title: attributes.title,
          fields: JSON.parse(attributes.fields as string).filter(
            // don't show non-keyword string fields
            ({ type, esTypes }: any) =>
              type !== 'string' || (esTypes && esTypes.includes('keyword'))
          ),
        });
      });
    })
    .catch(err => {
      // TODO: Show errors to users
    });
};
