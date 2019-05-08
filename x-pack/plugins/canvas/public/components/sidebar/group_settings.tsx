/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiText } from '@elastic/eui';

export const GroupSettings: FunctionComponent = () => (
  <EuiText size="s">
    <p>Ungroup (U) to edit individual element settings.</p>
    <p>Save this group as a new element to re-use it throughout your workpad.</p>
  </EuiText>
);
