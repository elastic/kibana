/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasePostRequest, ConnectorTypes } from '../../../../common/api';
import { SECURITY_SOLUTION_OWNER } from '../../../../common/constants';

export const newCase: CasePostRequest = {
  title: 'My new case',
  description: 'A description',
  tags: ['new', 'case'],
  connector: {
    id: 'none',
    name: 'none',
    type: ConnectorTypes.none,
    fields: null,
  },
  settings: {
    syncAlerts: true,
  },
  owner: SECURITY_SOLUTION_OWNER,
};
