/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiText } from '@elastic/eui';

import React from 'react';

interface Props {
  cardinality?: number;
  showIcon?: boolean;
}

export const DistinctValues = ({ cardinality, showIcon }: Props) => {
  if (cardinality === undefined) return null;
  return (
    <>
      {showIcon ? <EuiIcon type="database" size={'m'} className={'columnHeader__icon'} /> : null}
      <EuiText size={'xs'}>{cardinality}</EuiText>
    </>
  );
};
