/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResilientFieldsType, ConnectorResillientTypeFields } from '../../../common/api';
import { ExternalServiceFormatter } from '../types';

const format: ExternalServiceFormatter<ResilientFieldsType>['format'] = async (theCase) => {
  const { incidentTypes = null, severityCode = null } =
    (theCase.connector.fields as ConnectorResillientTypeFields['fields']) ?? {};
  return { incidentTypes, severityCode };
};

export const resilientExternalServiceFormatter: ExternalServiceFormatter<ResilientFieldsType> = {
  format,
};
