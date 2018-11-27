/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FieldValue, FormData } from 'formsy-react';

export const validatePath = {
  id: 'isPath',
  validationFunction: (values?: FormData, value?: FieldValue): boolean =>
    // TODO add more validation
    !!value && value.length > 0,
};
