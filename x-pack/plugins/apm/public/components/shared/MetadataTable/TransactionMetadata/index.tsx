/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { MetadataTable } from '..';
import type { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { getSectionsWithRows } from '../helper';
import { TRANSACTION_METADATA_SECTIONS } from './sections';

interface Props {
  transaction: Transaction;
}

export function TransactionMetadata({ transaction }: Props) {
  const sectionsWithRows = useMemo(
    () => getSectionsWithRows(TRANSACTION_METADATA_SECTIONS, transaction),
    [transaction]
  );
  return <MetadataTable sections={sectionsWithRows} />;
}
