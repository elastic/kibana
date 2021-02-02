/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { FormEvent, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { useApmServiceContext } from '../../context/apm_service/use_apm_service_context';
import { useUrlParams } from '../../context/url_params_context/use_url_params';
import { fromQuery, toQuery } from './Links/url_helpers';

// The default transaction type (for non-RUM services) is "request". Set the
// min-width on here to the width when "request" is loaded so it doesn't start
// out collapsed and change its width when the list of transaction types is loaded.
const EuiSelectWithWidth = styled(EuiSelect)`
  min-width: 157px;
`;

export function TransactionTypeSelect() {
  const { transactionTypes } = useApmServiceContext();
  const history = useHistory();
  const {
    urlParams: { transactionType },
  } = useUrlParams();

  const handleChange = useCallback(
    (event: FormEvent<HTMLSelectElement>) => {
      const selectedTransactionType = event.currentTarget.value;
      const newLocation = {
        ...history.location,
        search: fromQuery({
          ...toQuery(history.location.search),
          transactionType: selectedTransactionType,
        }),
      };
      history.push(newLocation);
    },
    [history]
  );

  const options = transactionTypes.map((t) => ({ text: t, value: t }));

  return (
    <>
      <EuiSelectWithWidth
        onChange={handleChange}
        options={options}
        prepend={i18n.translate('xpack.apm.transactionTypeSelectLabel', {
          defaultMessage: 'Type',
        })}
        value={transactionType}
      />
    </>
  );
}
