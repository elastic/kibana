/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserConfiguredActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import type { CasesConnectorRunParams } from '../../../../server/connectors/cases/types';

export type CasesActionConnector = UserConfiguredActionConnector<{}, {}>;

export type CasesSubActionParams = Pick<
  CasesConnectorRunParams,
  'groupingBy' | 'owner' | 'timeWindow' | 'reopenClosedCases'
>;

export interface CasesActionParams {
  subAction: string;
  subActionParams: CasesSubActionParams;
}
