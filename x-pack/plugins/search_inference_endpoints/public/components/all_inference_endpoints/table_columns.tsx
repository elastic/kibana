/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { useActions } from './use_actions';
import { ServiceProvider } from './service_provider';

export const useTableColumns = () => {
  const { actions } = useActions({ disableActions: false });

  const TABLE_COLUMNS = [
    {
      field: 'endpoint',
      name: i18n.translate('xpack.searchInferenceEndpoints.inferenceEndpoints.table.endpoint', {
        defaultMessage: 'Endpoint',
      }),
      sortable: true,
      width: '50%',
    },
    {
      field: 'provider',
      name: i18n.translate('xpack.searchInferenceEndpoints.inferenceEndpoints.table.provider', {
        defaultMessage: 'Provider',
      }),
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
      name: i18n.translate('xpack.searchInferenceEndpoints.inferenceEndpoints.table.type', {
        defaultMessage: 'Type',
      }),
      render: (type: string) => {
        if (type != null) {
          return <EuiBadge color="hollow">{type}</EuiBadge>;
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
