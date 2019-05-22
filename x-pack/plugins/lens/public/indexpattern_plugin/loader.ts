/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Chrome } from 'ui/chrome';
import { ToastNotifications } from 'ui/notify/toasts/toast_notifications';
import { SavedObjectAttributes } from 'src/legacy/server/saved_objects/service/saved_objects_client';
import { IndexPatternField } from './indexpattern';

interface IndexPatternAttributes extends SavedObjectAttributes {
  title: string;
  timeFieldName: string | null;
  fields: string;
  fieldFormatMap: string;
}

export const getIndexPatterns = (chrome: Chrome, toastNotifications: ToastNotifications) => {
  const savedObjectsClient = chrome.getSavedObjectsClient();
  return savedObjectsClient
    .find<IndexPatternAttributes>({
      type: 'index-pattern',
      perPage: 1000, // TODO: Paginate index patterns
    })
    .then(resp => {
      return resp.savedObjects.map(savedObject => {
        const { id, attributes } = savedObject;
        return Object.assign(attributes, {
          id,
          title: attributes.title,
          fields: (JSON.parse(attributes.fields) as IndexPatternField[]).filter(
            ({ type, esTypes }) => type !== 'string' || (esTypes && esTypes.includes('keyword'))
          ),
        });
      });
    })
    .catch(err => {
      toastNotifications.addDanger('Failed to load index patterns');
    });
};
