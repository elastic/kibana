/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServiceNowITSMFieldsType } from '../../../common/api';
import { ExternalServiceFormatter } from '../types';

const format: ExternalServiceFormatter<ServiceNowITSMFieldsType>['format'] = async (theCase) => {
  const { severity, urgency, impact } = theCase.connector.fields as ServiceNowITSMFieldsType;
  return { severity, urgency, impact };
};

export const serviceNowITSMExternalServiceFormatter: ExternalServiceFormatter<ServiceNowITSMFieldsType> = {
  format,
};
