/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FieldValue, FormData } from 'formsy-react';

export const validateNumeric = {
  id: 'isNumeric',
  validationFunction: (values?: FormData, value?: FieldValue): boolean =>
    /^[0-9]*$/.test(value || ''),
};
