/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import React from 'react';
import * as i18n from '../../../../common/translations';
import { useActions } from './render_actions/use_actions';
import { RenderEndpoint } from './render_endpoint/render_endpoint';
import { ServiceProvider } from './render_service_provider/service_provider';
import { TaskType } from './render_task_type/task_type';

export const useTableColumns = () => {
  const { actions } = useActions();

  const TABLE_COLUMNS = [
    {
      field: 'endpoint',
      name: i18n.ENDPOINT,
      render: (endpoint: InferenceAPIConfigResponse) => {
        if (endpoint != null) {
          return <RenderEndpoint endpoint={endpoint} />;
        }

        return null;
      },
      sortable: true,
      width: '50%',
    },
    {
      field: 'provider',
      name: i18n.SERVICE_PROVIDER,
      render: (provider: string) => {
        if (provider != null) {
          return <ServiceProvider providerKey={provider} />;
        }

        return null;
      },
      sortable: false,
      width: '110px',
    },
    {
      field: 'type',
      name: i18n.TASK_TYPE,
      render: (type: string) => {
        if (type != null) {
          return <TaskType type={type} />;
        }

        return null;
      },
      sortable: false,
      width: '90px',
    },
    actions,
  ];

  return TABLE_COLUMNS;
};
