/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import md5 from 'md5';

import * as i18n from './translations';
import { ErrorMessage } from './types';

export const permissionsReadOnlyErrorMessage: ErrorMessage = {
  id: 'read-only-privileges-error',
  title: i18n.READ_ONLY_FEATURE_TITLE,
  description: <>{i18n.READ_ONLY_FEATURE_MSG}</>,
  errorType: 'warning',
};

export const createCalloutId = (ids: string[], delimiter: string = '|'): string =>
  md5(ids.join(delimiter));
