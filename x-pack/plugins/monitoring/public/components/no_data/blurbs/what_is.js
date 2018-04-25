/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiTitle, EuiText, EuiTextColor } from '@elastic/eui';

export const WhatIs = () => {
  return (
    <Fragment>
      <EuiTitle size="l">
        <h2>Monitoring is currently off</h2>
      </EuiTitle>
      <EuiTextColor color="subdued">
        <EuiText>
          <p>
            Monitoring provides insight to your hardware performance and load.
          </p>
        </EuiText>
      </EuiTextColor>
    </Fragment>
  );
};
