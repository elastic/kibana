/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiIconProps } from '@elastic/eui';
import OsqueryLogo from './osquery.svg';

export type OsqueryIconProps = Omit<EuiIconProps, 'type'>;

const OsqueryIconComponent: React.FC<OsqueryIconProps> = (props) => (
  <EuiIcon size="xl" type={OsqueryLogo} {...props} />
);

export const OsqueryIcon = React.memo(OsqueryIconComponent);
