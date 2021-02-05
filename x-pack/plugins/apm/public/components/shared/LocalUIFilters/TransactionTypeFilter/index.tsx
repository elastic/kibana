/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiHorizontalRule,
  EuiRadioGroup,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { fromQuery, toQuery } from '../../Links/url_helpers';

interface Props {
  transactionTypes: string[];
}

function TransactionTypeFilter({ transactionTypes }: Props) {
  const history = useHistory();
  const {
    urlParams: { transactionType },
  } = useUrlParams();

  const options = transactionTypes.map((type) => ({
    id: type,
    label: type,
  }));

  return (
    <>
      <EuiTitle size="xxxs" textTransform="uppercase">
        <h4>
          {i18n.translate('xpack.apm.localFilters.titles.transactionType', {
            defaultMessage: 'Transaction type',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="none" />
      <EuiSpacer size="s" />
      <EuiRadioGroup
        options={options}
        idSelected={transactionType}
        onChange={(selectedTransactionType) => {
          const newLocation = {
            ...history.location,
            search: fromQuery({
              ...toQuery(history.location.search),
              transactionType: selectedTransactionType,
            }),
          };
          history.push(newLocation);
        }}
      />
    </>
  );
}

export { TransactionTypeFilter };
