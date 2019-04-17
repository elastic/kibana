/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';
import { Transaction } from '../../../../../typings/es_schemas/ui/Transaction';
import { PropertiesTable } from '../../../shared/PropertiesTable';

interface Props {
  transaction: Transaction;
}

export const TransactionPropertiesTableForFlyout: React.SFC<Props> = ({
  transaction
}) => {
  return (
    <div>
      <EuiTitle size="s">
        <h4>Metadata</h4>
      </EuiTitle>
      <EuiSpacer />
      <PropertiesTable item={transaction} />
    </div>
  );
};
