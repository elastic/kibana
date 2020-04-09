/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CasePostRequest } from '../../../common/api';

export const newCase: CasePostRequest = {
  title: 'My new case',
  description: 'A description',
  tags: ['new', 'case'],
};
