/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FieldValue, FormData } from 'formsy-react';
import yaml from 'js-yaml';

export const validateYaml = {
  id: 'isYaml',
  validationFunction: (values?: FormData, value?: FieldValue): boolean => {
    try {
      const stuff = yaml.safeLoad(value || '');
      if (typeof stuff === 'string') {
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  },
};
