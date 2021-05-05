/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExternalServiceFormatter } from '../types';
import { ConnectorSwimlaneTypeFields, SwimlaneUnmappedFieldsType } from '../../../common';

const format: ExternalServiceFormatter<SwimlaneUnmappedFieldsType>['format'] = (theCase) => {
  const { alertSource = null, caseId = null, caseName = null, severity = null } =
    (theCase.connector.fields as ConnectorSwimlaneTypeFields['fields']) ?? {};
  return { alertSource, caseId, caseName, severity };
};

export const swimlaneExternalServiceFormatter: ExternalServiceFormatter<SwimlaneUnmappedFieldsType> = {
  format,
};
