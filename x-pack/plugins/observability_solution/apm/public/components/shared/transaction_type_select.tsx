/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelect } from '@elastic/eui';
import React, { FormEvent, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { useApmServiceContext } from '../../context/apm_service/use_apm_service_context';
import { useBreakpoints } from '../../hooks/use_breakpoints';
import * as urlHelpers from './links/url_helpers';

// The default transaction type (for non-RUM services) is "request". Set the
// min-width on here to the width when "request" is loaded so it doesn't start
// out collapsed and change its width when the list of transaction types is loaded.
const EuiSelectWithWidth = styled(EuiSelect)`
  min-width: 200px;
`;

export function TransactionTypeSelectBase({
  transactionTypes,
  selectedTransactionType,
  onChange,
}: {
  transactionTypes: string[];
  selectedTransactionType: string | undefined;
  onChange: React.ChangeEventHandler<HTMLSelectElement>;
}) {
  const { isSmall } = useBreakpoints();

  const options = transactionTypes.map((t) => ({ text: t, value: t }));

  return (
    <EuiSelectWithWidth
      fullWidth={isSmall}
      data-test-subj="headerFilterTransactionType"
      onChange={onChange}
      options={options}
      value={selectedTransactionType}
    />
  );
}

export function TransactionTypeSelect() {
  const { transactionTypes, transactionType } = useApmServiceContext();
  const history = useHistory();

  const handleChange = useCallback(
    (event: FormEvent<HTMLSelectElement>) => {
      const selectedTransactionType = event.currentTarget.value;
      urlHelpers.push(history, {
        query: { transactionType: selectedTransactionType },
      });
    },
    [history]
  );

  return (
    <TransactionTypeSelectBase
      transactionTypes={transactionTypes}
      selectedTransactionType={transactionType}
      onChange={handleChange}
    />
  );
}
