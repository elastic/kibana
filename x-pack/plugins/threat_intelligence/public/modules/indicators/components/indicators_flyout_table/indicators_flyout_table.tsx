/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiInMemoryTable } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { VFC } from 'react';
import { EMPTY_VALUE } from '../../../../../common/constants';
import { Indicator, RawIndicatorFieldId } from '../../../../../common/types/Indicator';
import { unwrapValue } from '../../lib/unwrap_value';

export const EMPTY_PROMPT_TEST_ID = 'tiFlyoutTableEmptyPrompt';
export const TABLE_TEST_ID = 'tiFlyoutTableMemoryTable';

const columns = [
  {
    field: 'field',
    name: (
      <FormattedMessage
        id="xpack.threatIntelligence.indicator.flyoutTable.fieldColumnLabel"
        defaultMessage="Field"
      />
    ),
    sortable: true,
  },
  {
    field: 'value',
    name: (
      <FormattedMessage
        id="xpack.threatIntelligence.indicator.flyoutTable.valueColumnLabel"
        defaultMessage="Value"
      />
    ),
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

  for (const key in indicator.fields) {
    if (!indicator.fields.hasOwnProperty(key)) continue;
    items.push({
      field: key,
      value: unwrapValue(indicator, key as RawIndicatorFieldId) || EMPTY_VALUE,
    });
  }

  return items.length === 0 ? (
    <EuiEmptyPrompt
      iconType="alert"
      color="danger"
      title={
        <h2>
          <FormattedMessage
            id="xpack.threatIntelligence.indicator.flyoutTable.errorMessageTitle"
            defaultMessage="Unable to display indicator information"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.threatIntelligence.indicator.flyoutTable.errorMessageBody"
            defaultMessage="There was an error displaying the indicator fields and values."
          />
        </p>
      }
      data-test-subj={EMPTY_PROMPT_TEST_ID}
    />
  ) : (
    <EuiInMemoryTable
      items={items}
      columns={columns}
      search={search}
      sorting={true}
      data-test-subj={TABLE_TEST_ID}
    />
  );
};
