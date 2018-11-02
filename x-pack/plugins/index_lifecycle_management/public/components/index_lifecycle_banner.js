/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiText
} from '@elastic/eui';

export const IndexLifecycleBanner = (props) => {
  const numberOfErroredIndices = props.indices.length;
  return (
    <EuiCallOut
      color="warning"
      size="m"
    >
      <EuiText
        grow={true}
      >
        { numberOfErroredIndices } ind{numberOfErroredIndices > 1 ? 'icies have ' : 'ex has ' } index lifecycle errors.
      </EuiText>
    </EuiCallOut>
  );
};