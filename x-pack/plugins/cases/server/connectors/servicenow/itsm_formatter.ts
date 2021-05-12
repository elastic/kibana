/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceNowITSMFieldsType, ConnectorServiceNowITSMTypeFields } from '../../../common';
import { ExternalServiceFormatter } from '../types';

const format: ExternalServiceFormatter<ServiceNowITSMFieldsType>['format'] = (theCase) => {
  const { severity = null, urgency = null, impact = null, category = null, subcategory = null } =
    (theCase.connector.fields as ConnectorServiceNowITSMTypeFields['fields']) ?? {};
  return { severity, urgency, impact, category, subcategory };
};

export const serviceNowITSMExternalServiceFormatter: ExternalServiceFormatter<ServiceNowITSMFieldsType> = {
  format,
};
