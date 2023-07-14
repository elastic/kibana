/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ExternalServiceRt } from '../../types/domain/external_service/v1';
import { CaseConnectorRt } from './connector';

const PushDetailsRt = rt.strict({
  latestUserActionPushDate: rt.string,
  oldestUserActionPushDate: rt.string,
  externalService: ExternalServiceRt,
});

const CaseConnectorPushInfoRt = rt.intersection([
  rt.strict({
    needsToBePushed: rt.boolean,
    hasBeenPushed: rt.boolean,
  }),
  rt.exact(
    rt.partial({
      details: PushDetailsRt,
    })
  ),
]);

export const GetCaseConnectorsResponseRt = rt.record(
  rt.string,
  rt.intersection([
    rt.strict({
      push: CaseConnectorPushInfoRt,
    }),
    CaseConnectorRt,
  ])
);

export type GetCaseConnectorsResponse = rt.TypeOf<typeof GetCaseConnectorsResponseRt>;
export type GetCaseConnectorsPushDetails = rt.TypeOf<typeof PushDetailsRt>;
