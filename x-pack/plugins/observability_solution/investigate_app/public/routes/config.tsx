/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { InvestigationDetailsPage } from '../pages/details/investigation_details_page';
import { InvestigationListPage } from '../pages/list/investigation_list_page';

export const getRoutes = (): {
  [path: string]: {
    handler: () => React.ReactElement;
    params: Record<string, string>;
    exact: boolean;
  };
} => {
  return {
    '/': {
      handler: () => {
        return <InvestigationListPage />;
      },
      params: {},
      exact: true,
    },
    '/:investigationId': {
      handler: () => {
        return <InvestigationDetailsPage />;
      },
      params: {},
      exact: true,
    },
  };
};
