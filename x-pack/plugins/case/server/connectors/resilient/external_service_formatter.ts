/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CaseResponse, ResilientFieldsType } from '../../../common/api';
import { ExternalServiceFormatter } from '../types';

const format = async (theCase: CaseResponse) => {
  const { incidentTypes, severityCode } = theCase.connector.fields as ResilientFieldsType;
  return { incidentTypes, severityCode };
};

export const resilientExternalServiceFormatter: ExternalServiceFormatter<ResilientFieldsType> = {
  format,
};
