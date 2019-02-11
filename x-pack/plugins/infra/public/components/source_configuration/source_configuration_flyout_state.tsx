/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { WithBinary, WithBinaryProps } from '../../containers/primitives/with_binary';

export const WithSourceConfigurationFlyoutState: React.SFC<WithBinaryProps> = props => (
  <WithBinary {...props} context="source-configuration-flyout" />
);
