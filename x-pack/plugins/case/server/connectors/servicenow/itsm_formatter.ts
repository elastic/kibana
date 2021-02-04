/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceNowITSMFieldsType, ConnectorServiceNowITSMTypeFields } from '../../../common/api';
import { ExternalServiceFormatter } from '../types';

const format: ExternalServiceFormatter<ServiceNowITSMFieldsType>['format'] = async (theCase) => {
  const { severity = null, urgency = null, impact = null } =
    (theCase.connector.fields as ConnectorServiceNowITSMTypeFields['fields']) ?? {};
  return { severity, urgency, impact };
};

export const serviceNowITSMExternalServiceFormatter: ExternalServiceFormatter<ServiceNowITSMFieldsType> = {
  format,
};
