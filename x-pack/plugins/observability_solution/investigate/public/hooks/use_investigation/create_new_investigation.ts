/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { GetInvestigationResponse } from '@kbn/investigation-shared';
import { v4 } from 'uuid';
import type { Investigation } from '../../../common';

export function createNewInvestigation(): Investigation {
  return {
    id: v4(),
    createdAt: new Date().getTime(),
    title: i18n.translate('xpack.investigate.newInvestigationTitle', {
      defaultMessage: 'New investigation',
    }),
    items: [],
    notes: [],
    parameters: {
      timeRange: {
        from: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        to: new Date().toISOString(),
      },
    },
  };
}

export function fromInvestigationResponse(
  investigationData: GetInvestigationResponse
): Investigation {
  return {
    id: investigationData.id,
    createdAt: investigationData.createdAt,
    title: investigationData.title,
    items: [],
    notes: investigationData.notes,
    parameters: {
      timeRange: {
        from: new Date(investigationData.params.timeRange.from).toISOString(),
        to: new Date(investigationData.params.timeRange.to).toISOString(),
      },
    },
  };
}
