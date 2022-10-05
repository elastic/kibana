/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Search } from '@elastic/eui';
import { EuiInMemoryTable } from '@elastic/eui';
import React, { useMemo } from 'react';

import { getTableColumns } from './helpers';
import * as i18n from './translations';
import type { EnrichedFieldMetadata } from '../types';

const search: Search = {
  box: {
    incremental: true,
    placeholder: i18n.SEARCH_FIELDS,
    schema: true,
  },
};

interface Props {
  enrichedFieldMetadata: EnrichedFieldMetadata[];
}

const CompareFieldsTableComponent: React.FC<Props> = ({ enrichedFieldMetadata }) => {
  const columns = useMemo(() => getTableColumns(), []);

  return (
    <EuiInMemoryTable
      items={enrichedFieldMetadata}
      columns={columns}
      search={search}
      pagination={true}
      sorting={true}
    />
  );
};

CompareFieldsTableComponent.displayName = 'CompareFieldsTableComponent';

export const CompareFieldsTable = React.memo(CompareFieldsTableComponent);
