/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingElastic } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React from 'react';

import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';

export function DiagnosticsIndexTemplates() {
  const { data, status } = useFetcher((callApmApi) => {
    return callApmApi(`GET /internal/apm/diagnostics/index_templates`);
  }, []);

  if (status === FETCH_STATUS.LOADING) {
    return <EuiLoadingElastic size="m" />;
  }

  const items = Object.entries(data?.defaultApmIndexTemplateStates ?? {}).map(
    ([defaultName, item]) => {
      return {
        ...item,
        defaultName,
      };
    }
  );
  type Item = typeof items[0];

  const columns: Array<EuiBasicTableColumn<Item>> = [
    {
      name: 'Index template name',
      field: 'name',
      render: (_, item) => {
        return item.name || item.defaultName;
      },
      truncateText: true,
    },
    {
      name: 'Exists',
      field: 'exists',
      render: (_, { exists }) => {
        return exists ? (
          <EuiBadge color="green">OK</EuiBadge>
        ) : (
          <EuiBadge color="danger">Not found</EuiBadge>
        );
      },
      truncateText: true,
    },
  ];

  return (
    <>
      <EuiText>
        This section lists the names of the default APM Index Templates and
        whether it exists or not
      </EuiText>

      <EuiSpacer />

      <EuiBasicTable
        tableCaption="Expected Index Templates"
        items={items}
        rowHeader="firstName"
        columns={columns}
      />
    </>
  );
}
