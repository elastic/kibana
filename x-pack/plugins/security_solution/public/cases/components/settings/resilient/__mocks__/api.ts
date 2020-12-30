/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Props } from '../api';
import { ResilientIncidentTypes, ResilientSeverity } from '../types';

const severity = [
  {
    id: 4,
    name: 'Low',
  },
  {
    id: 5,
    name: 'Medium',
  },
  {
    id: 6,
    name: 'High',
  },
];

const incidentTypes = [
  { id: 17, name: 'Communication error (fax; email)' },
  { id: 1001, name: 'Custom type' },
];

export const getIncidentTypes = async (props: Props): Promise<{ data: ResilientIncidentTypes }> =>
  Promise.resolve({ data: incidentTypes });

export const getSeverity = async (props: Props): Promise<{ data: ResilientSeverity }> =>
  Promise.resolve({ data: severity });
