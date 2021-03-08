/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each } from 'lodash';

import { ml } from './ml_api_service';

// Returns the mapping type of the specified field.
// Accepts fieldName containing dots representing a nested sub-field.
export function getFieldTypeFromMapping(index, fieldName) {
  return new Promise((resolve, reject) => {
    if (index !== '') {
      ml.getFieldCaps({ index, fields: [fieldName] })
        .then((resp) => {
          let fieldType = '';
          each(resp.fields, (field) => {
            each(field, (type) => {
              if (fieldType === '') {
                fieldType = type.type;
              }
            });
          });
          resolve(fieldType);
        })
        .catch((error) => {
          reject(error);
        });
    } else {
      reject();
    }
  });
}
