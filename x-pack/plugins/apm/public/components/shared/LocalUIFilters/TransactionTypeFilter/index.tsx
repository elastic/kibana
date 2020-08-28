/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiTitle,
  EuiHorizontalRule,
  EuiSpacer,
  EuiRadioGroup,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { history } from '../../../../utils/history';
import { fromQuery, toQuery } from '../../Links/url_helpers';

interface Props {
  transactionTypes: string[];
}

function TransactionTypeFilter({ transactionTypes }: Props) {
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
