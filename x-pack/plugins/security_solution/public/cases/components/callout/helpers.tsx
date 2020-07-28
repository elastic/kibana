/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import md5 from 'md5';

import * as i18n from './translations';
import { ErrorMessage } from './types';

export const savedObjectReadOnlyErrorMessage: ErrorMessage = {
  id: 'read-only-privileges-error',
  title: i18n.READ_ONLY_SAVED_OBJECT_TITLE,
  description: <>{i18n.READ_ONLY_SAVED_OBJECT_MSG}</>,
  errorType: 'warning',
};

export const createCalloutId = (ids: string[], delimiter: string = '|'): string =>
  md5(ids.join(delimiter));
