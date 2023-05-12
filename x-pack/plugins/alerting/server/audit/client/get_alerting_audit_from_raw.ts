/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertingAuditSOAttributes } from '../../../common';

export interface GetAlertingAuditFromRawParams {
  id: string;
  attributes: AlertingAuditSOAttributes;
}

export const getAlertingAuditFromRaw = ({ id, attributes }: GetAlertingAuditFromRawParams) => {
  return {
    ...attributes,
    id,
  };
};
