/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Chrome } from 'ui/chrome';
import { ToastNotifications } from 'ui/notify/toasts/toast_notifications';
import { IndexPatternField } from './indexpattern';

interface IndexPatternSavedObject {
  id: string;
  type: string;
  attributes: {
    title: string;
    timeFieldName?: string;
    fields: string;
    fieldFormatMap: string;
  };
}

export const getIndexPatterns = (chrome: Chrome, toastNotifications: ToastNotifications) => {
  const savedObjectsClient = chrome.getSavedObjectsClient();
  return savedObjectsClient
    .find({
      type: 'index-pattern',
      perPage: 1000, // TODO: Paginate index patterns
    })
    .then(resp => {
      return resp.savedObjects.map(savedObject => {
        const { id, attributes } = (savedObject as unknown) as IndexPatternSavedObject;
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
