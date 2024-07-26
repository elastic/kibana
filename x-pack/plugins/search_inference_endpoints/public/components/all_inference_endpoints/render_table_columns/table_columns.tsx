/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import React from 'react';
import type { HorizontalAlignment } from '@elastic/eui';
import * as i18n from '../../../../common/translations';
import { useActions } from './render_actions/use_actions';
import { EndpointInfo } from './render_endpoint/endpoint_info';
import { ServiceProvider } from './render_service_provider/service_provider';
import { TaskType } from './render_task_type/task_type';
import { DeploymentStatus } from './render_deployment_status/deployment_status';
import { DeploymentStatusEnum, ServiceProviderKeys, TaskTypes } from '../types';

export const useTableColumns = () => {
  const { actions } = useActions();
  const deploymentAlignment: HorizontalAlignment = 'center';

  const TABLE_COLUMNS = [
    {
      field: 'deployment',
      name: '',
      render: (deployment: DeploymentStatusEnum) => {
        if (deployment != null) {
          return <DeploymentStatus status={deployment} />;
        }

        return null;
      },
      width: '64px',
      align: deploymentAlignment,
    },
    {
      field: 'endpoint',
      name: i18n.ENDPOINT,
      render: (endpoint: InferenceAPIConfigResponse) => {
        if (endpoint != null) {
          return <EndpointInfo endpoint={endpoint} />;
        }

        return null;
      },
      sortable: true,
    },
    {
      field: 'provider',
      name: i18n.SERVICE_PROVIDER,
      render: (provider: ServiceProviderKeys) => {
        if (provider != null) {
          return <ServiceProvider providerKey={provider} />;
        }

        return null;
      },
      sortable: false,
      width: '185px',
    },
    {
      field: 'type',
      name: i18n.TASK_TYPE,
      render: (type: TaskTypes) => {
        if (type != null) {
          return <TaskType type={type} />;
        }

        return null;
      },
      sortable: false,
      width: '185px',
    },
    actions,
  ];

  return TABLE_COLUMNS;
};
