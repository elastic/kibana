/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExternalServiceFormatter } from '../types';
import { ConnectorSwimlaneTypeFields, SwimlaneFieldsType } from '../../../common';

const format: ExternalServiceFormatter<SwimlaneFieldsType>['format'] = (theCase) => {
  const { caseId = theCase.id } =
    (theCase.connector.fields as ConnectorSwimlaneTypeFields['fields']) ?? {};
  return { caseId };
};

export const swimlaneExternalServiceFormatter: ExternalServiceFormatter<SwimlaneFieldsType> = {
  format,
};
