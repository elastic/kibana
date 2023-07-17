/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ConnectorMappingsRt } from '../../domain/connector/v1';

export const ConnectorMappingResponseRt = rt.strict({
  id: rt.string,
  version: rt.string,
  mappings: ConnectorMappingsRt,
});

export type ConnectorMappingResponse = rt.TypeOf<typeof ConnectorMappingResponseRt>;
