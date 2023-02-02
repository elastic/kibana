/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CaseConnectorRt } from './connector';
import { CaseExternalServiceBasicRt } from '../cases';

const PushDetailsRt = rt.type({
  latestUserActionPushDate: rt.string,
  oldestUserActionPushDate: rt.string,
  externalService: CaseExternalServiceBasicRt,
});

const CaseConnectorPushInfoRt = rt.intersection([
  rt.type({
    needsToBePushed: rt.boolean,
    hasBeenPushed: rt.boolean,
  }),
  rt.partial({
    details: PushDetailsRt,
  }),
]);

export const GetCaseConnectorsResponseRt = rt.record(
  rt.string,
  rt.intersection([
    rt.type({
      push: CaseConnectorPushInfoRt,
    }),
    CaseConnectorRt,
  ])
);

export type GetCaseConnectorsResponse = rt.TypeOf<typeof GetCaseConnectorsResponseRt>;
export type GetCaseConnectorsPushDetails = rt.TypeOf<typeof PushDetailsRt>;
