/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesConfigureAttributes } from '../../../common/api';
import { ESCaseConnector } from '..';

/**
 * This type should only be used within the configure service. It represents how the configure saved object will be layed
 * out in ES.
 */
export type ESCasesConfigureAttributes = Omit<CasesConfigureAttributes, 'connector'> & {
  connector: ESCaseConnector;
};
