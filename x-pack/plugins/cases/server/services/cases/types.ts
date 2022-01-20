/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { CaseAttributes, CaseExternalServiceBasicRt } from '../../../common/api';
import { ESCaseConnector } from '..';

/**
 * This type should only be used within the cases service and its helper functions (e.g. the transforms).
 *
 * The type represents how the external services portion of the object will be layed out when stored in ES. The external_service will have its
 * connector_id field removed and placed within the references field.
 */
export type ExternalServicesWithoutConnectorId = Omit<
  rt.TypeOf<typeof CaseExternalServiceBasicRt>,
  'connector_id'
>;

/**
 * This type should only be used within the cases service and its helper functions (e.g. the transforms).
 *
 * The type represents how the Cases object will be layed out in ES. It will not have connector.id or external_service.connector_id.
 * Instead those fields will be transformed into the references field.
 */
export type ESCaseAttributes = Omit<CaseAttributes, 'connector' | 'external_service'> & {
  connector: ESCaseConnector;
  external_service: ExternalServicesWithoutConnectorId | null;
};
