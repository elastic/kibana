/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
// @ts-ignore
import DiscoverButton from 'x-pack/plugins/apm/public/components/shared/DiscoverButton';
// @ts-ignore
import { StickyProperties } from 'x-pack/plugins/apm/public/components/shared/StickyProperties';
import { Transaction } from '../../../../../../../../typings/Transaction';

interface Props {
  transaction: Transaction;
}
export const SecondLevelStickyProperties: React.SFC<Props> = ({
  transaction
}: Props) => {
  const properties = [
    {
      fieldName: '@timestamp',
      label: 'Timestamp',
      val: transaction['@timestamp']
    }
  ];
  return <StickyProperties stickyProperties={properties} />;
};
