/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CasesConfigurationMapping } from '../../containers/case/configure/types';
import serviceNowLogo from './logos/servicenow.svg';
import { Connector } from './types';

const connectors: Record<string, Connector> = {
  '.servicenow': {
    actionTypeId: '.servicenow',
    logo: serviceNowLogo,
  },
};

const defaultMapping: CasesConfigurationMapping[] = [
  {
    source: 'title',
    target: 'short_description',
    actionType: 'overwrite',
  },
  {
    source: 'description',
    target: 'description',
    actionType: 'overwrite',
  },
  {
    source: 'comments',
    target: 'comments',
    actionType: 'append',
  },
];

export { connectors, defaultMapping };
