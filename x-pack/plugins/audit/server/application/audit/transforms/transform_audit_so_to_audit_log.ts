/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuditLog } from '../../../../common';
import { AuditSOAttributes } from '../../../data/audit';

interface GetAuditFromRawParams {
  id: string;
  attributes: AuditSOAttributes;
}

export const transformAuditSoToAuditLog = ({ id, attributes }: GetAuditFromRawParams): AuditLog => {
  return {
    ...attributes,
    id,
  };
};
