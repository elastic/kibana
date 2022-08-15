/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiInMemoryTable } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { VFC } from 'react';
import { Indicator } from '../../../../../common/types/indicator';
import { IndicatorField } from '../indicator_field/indicator_field';

export const EMPTY_PROMPT_TEST_ID = 'tiFlyoutTableEmptyPrompt';
export const TABLE_TEST_ID = 'tiFlyoutTableMemoryTable';

const search = {
  box: {
    incremental: true,
    schema: true,
  },
};

export interface IndicatorsFlyoutTableProps {
  indicator: Indicator;
  fieldTypesMap: { [id: string]: string };
}

export const IndicatorsFlyoutTable: VFC<IndicatorsFlyoutTableProps> = ({
  indicator,
  fieldTypesMap,
}) => {
  const items: string[] = Object.keys(indicator.fields);
  const columns = [
    {
      name: (
        <FormattedMessage
          id="xpack.threatIntelligence.indicator.flyoutTable.fieldColumnLabel"
          defaultMessage="Field"
        />
      ),
      render: (field: string) => field,
    },
    {
      name: (
        <FormattedMessage
          id="xpack.threatIntelligence.indicator.flyoutTable.valueColumnLabel"
          defaultMessage="Value"
        />
      ),
      render: (field: string) => (
        <IndicatorField indicator={indicator} field={field} fieldTypesMap={fieldTypesMap} />
      ),
    },
  ];

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
