/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { HeaderLarge } from '../../shared/UIComponents';
import Transaction from './Transaction';
import Distribution from './Distribution';
import Charts from './Charts';

function TransactionDetails({ urlParams }) {
  return (
    <div>
      <HeaderLarge>{urlParams.transactionName}</HeaderLarge>
      <Charts />
      <Distribution />
      <Transaction />
    </div>
  );
}

export default TransactionDetails;
