/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCodeBlock } from '@elastic/eui';
import { State } from '../types';
import { useLoader } from '../state';

export function Table(props: { state: State }) {
  const loader = useLoader();
  console.log('rendering table', { ...loader.lastData });
  return (
    <>
      <EuiCodeBlock language="json">{JSON.stringify(loader.lastData, null, 2)}</EuiCodeBlock>
    </>
  );
}
