/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResilientFieldsType, ConnectorResillientTypeFields } from '../../../common';
import { ExternalServiceFormatter } from '../types';

const format: ExternalServiceFormatter<ResilientFieldsType>['format'] = (theCase) => {
  const { incidentTypes = null, severityCode = null } =
    (theCase.connector.fields as ConnectorResillientTypeFields['fields']) ?? {};
  return { incidentTypes, severityCode };
};

export const resilientExternalServiceFormatter: ExternalServiceFormatter<ResilientFieldsType> = {
  format,
};
