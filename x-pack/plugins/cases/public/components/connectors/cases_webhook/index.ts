/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';

import { ConnectorTypes } from '../../../../common/types/domain';
import type { CaseConnector } from '../types';

export const getCaseConnector = (): CaseConnector<null> => {
  return {
    id: ConnectorTypes.casesWebhook,
    fieldsComponent: lazy(() => import('./case_fields')),
    previewComponent: lazy(() => import('./case_fields_preview')),
  };
};
