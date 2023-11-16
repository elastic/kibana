/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ExternalServiceRt } from '../../domain/external_service/v1';
import { CaseConnectorRt, ConnectorMappingsRt } from '../../domain/connector/v1';

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

const ActionConnectorResultRt = rt.intersection([
  rt.strict({
    id: rt.string,
    actionTypeId: rt.string,
    name: rt.string,
    isDeprecated: rt.boolean,
    isPreconfigured: rt.boolean,
    isSystemAction: rt.boolean,
    referencedByCount: rt.number,
  }),
  rt.exact(rt.partial({ config: rt.record(rt.string, rt.unknown), isMissingSecrets: rt.boolean })),
]);

export const FindActionConnectorResponseRt = rt.array(ActionConnectorResultRt);

export const ConnectorMappingResponseRt = rt.strict({
  id: rt.string,
  version: rt.string,
  mappings: ConnectorMappingsRt,
});

export type ConnectorMappingResponse = rt.TypeOf<typeof ConnectorMappingResponseRt>;
export type GetCaseConnectorsResponse = rt.TypeOf<typeof GetCaseConnectorsResponseRt>;
export type GetCaseConnectorsPushDetails = rt.TypeOf<typeof PushDetailsRt>;
