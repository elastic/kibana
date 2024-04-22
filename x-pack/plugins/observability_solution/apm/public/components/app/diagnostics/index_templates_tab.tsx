/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiLoadingElastic } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useDiagnosticsContext } from './context/use_diagnostics';

type DiagnosticsBundle = APIReturnType<'GET /internal/apm/diagnostics'>;

export function DiagnosticsIndexTemplates() {
  const { diagnosticsBundle, status } = useDiagnosticsContext();

  if (status === FETCH_STATUS.LOADING) {
    return <EuiLoadingElastic size="m" />;
  }

  const items = diagnosticsBundle?.apmIndexTemplates ?? [];
  const columns: Array<EuiBasicTableColumn<typeof items[0]>> = [
    {
      name: 'Index template name',
      field: 'name',
      render: (_, { name }) => name,
      truncateText: true,
    },
    {
      name: 'Status',
      field: 'status',
      render: (_, { exists, isNonStandard }) => {
        if (isNonStandard) {
          return <EuiBadge color="warning">Non standard</EuiBadge>;
        }

        if (!exists) {
          return <EuiBadge color="danger">Not found</EuiBadge>;
        }

        return <EuiBadge color="green">OK</EuiBadge>;
      },
      truncateText: true,
    },
  ];

  return (
    <>
      <NonStandardIndexTemplateCalout diagnosticsBundle={diagnosticsBundle} />
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

function NonStandardIndexTemplateCalout({
  diagnosticsBundle,
}: {
  diagnosticsBundle?: DiagnosticsBundle;
}) {
  const nonStandardIndexTemplates =
    diagnosticsBundle?.apmIndexTemplates?.filter(
      ({ isNonStandard }) => isNonStandard
    );

  if (!nonStandardIndexTemplates?.length) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        title="Non-standard index templates"
        color="warning"
        iconType="warning"
      >
        The following index templates do not follow the recommended naming
        scheme:{' '}
        {nonStandardIndexTemplates.map(({ name }) => (
          <EuiBadge>{name}</EuiBadge>
        ))}
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
}
