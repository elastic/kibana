/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiInMemoryTable } from '@elastic/eui';
import React, { VFC } from 'react';
import { Indicator } from '../../../../common/types/Indicator';

export const EMPTY_PROMPT_TEST_ID = 'tiFlyoutTableEmptyPrompt';
export const TABLE_TEST_ID = 'tiFlyoutTableMemoryTable';

const columns = [
  {
    field: 'field',
    name: 'Field',
    sortable: true,
  },
  {
    field: 'value',
    name: 'Value',
    truncateText: true,
  },
];
const search = {
  box: {
    incremental: true,
    schema: true,
  },
};

export const IndicatorsFlyoutTable: VFC<{ indicator: Indicator }> = ({ indicator }) => {
  const items: Array<{ field: string; value: string }> = [];
  for (const key in indicator) {
    if (!indicator.hasOwnProperty(key)) continue;
    items.push({ field: key, value: indicator[key] });
  }

  return items.length === 0 ? (
    <EuiEmptyPrompt
      iconType="alert"
      color="danger"
      title={<h2>Unable to display indicator information</h2>}
      body={<p>There was an error displaying the indicator fields and values.</p>}
      data-test-subj={EMPTY_PROMPT_TEST_ID}
    />
  ) : (
    <EuiInMemoryTable
      tableCaption="Indicator of Compromise fields"
      items={items}
      columns={columns}
      search={search}
      sorting={true}
      data-test-subj={TABLE_TEST_ID}
    />
  );
};
