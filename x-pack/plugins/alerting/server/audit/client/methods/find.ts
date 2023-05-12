/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { KueryNode } from '@kbn/es-query';
import { IndexType } from '../../../rules_client';
import { getAlertingAuditFromRaw } from '../get_alerting_audit_from_raw';
import {
  ALERTING_AUDIT_SAVED_OBJECT_TYPE,
  AlertingAuditLog,
  AlertingAuditSOAttributes,
} from '../../../../common';
import { AlertingAuditClientContext } from '../alerting_audit_client';

export interface FindResult {
  page: number;
  perPage: number;
  total: number;
  data: AlertingAuditLog[];
}

export interface AlertingAuditFindParams {
  options?: FindOptions;
}

export interface FindOptions extends IndexType {
  perPage?: number;
  page?: number;
  sortField?: string;
  sortOrder?: estypes.SortOrder;
  search?: string;
  fields?: string[];
  filter?: string | KueryNode;
}

export async function find(
  context: AlertingAuditClientContext,
  params: AlertingAuditFindParams
): Promise<FindResult> {
  const { savedObjectsClient, logger } = context;

  try {
    const result = await savedObjectsClient.find<AlertingAuditSOAttributes>({
      type: ALERTING_AUDIT_SAVED_OBJECT_TYPE,
      ...params.options,
    });

    return {
      page: result.page,
      perPage: result.per_page,
      total: result.total,
      data: result.saved_objects.map((so) => getAlertingAuditFromRaw(so)),
    };
  } catch (e) {
    const errorMessage = `Failed to find audit data, Error: ${e}`;
    logger.error(errorMessage);
    throw Boom.boomify(e, { message: errorMessage });
  }
}
