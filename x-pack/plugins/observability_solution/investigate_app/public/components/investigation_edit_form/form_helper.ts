/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateInvestigationParams, UpdateInvestigationParams } from '@kbn/investigation-shared';
import { v4 as uuidv4 } from 'uuid';
import type { InvestigationForm } from './investigation_edit_form';

export function toCreateInvestigationParams(data: InvestigationForm): CreateInvestigationParams {
  return {
    id: uuidv4(),
    title: data.title,
    params: {
      timeRange: {
        from: new Date(new Date().getTime() - 30 * 60 * 1000).getTime(),
        to: new Date().getTime(),
      },
    },
    tags: data.tags,
    origin: {
      type: 'blank',
    },
    externalIncidentUrl:
      data.externalIncidentUrl && data.externalIncidentUrl.trim().length > 0
        ? data.externalIncidentUrl
        : null,
  };
}

export function toUpdateInvestigationParams(data: InvestigationForm): UpdateInvestigationParams {
  return {
    title: data.title,
    status: data.status,
    tags: data.tags,
    externalIncidentUrl:
      data.externalIncidentUrl && data.externalIncidentUrl.trim().length > 0
        ? data.externalIncidentUrl
        : null,
  };
}
