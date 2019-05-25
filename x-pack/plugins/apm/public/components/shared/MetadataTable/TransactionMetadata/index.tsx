/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MetadataTable } from '..';
import { TRANSACTION_METADATA_SECTIONS } from './sections';
import { Transaction } from '../../../../../typings/es_schemas/ui/Transaction';

interface Props {
  transaction: Transaction;
}

export function TransactionMetadata({ transaction }: Props) {
  return (
    <MetadataTable
      item={transaction}
      sections={TRANSACTION_METADATA_SECTIONS}
    />
  );
}
