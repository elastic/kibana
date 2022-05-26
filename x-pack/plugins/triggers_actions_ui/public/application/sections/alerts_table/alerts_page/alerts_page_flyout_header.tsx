/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AlertsTableFlyoutBaseProps } from '../../../../types';

type FlyoutHeaderProps = AlertsTableFlyoutBaseProps;
const FlyoutHeader = (props: FlyoutHeaderProps) => {
  return <h2>Alerts page</h2>;
};

// eslint-disable-next-line import/no-default-export
export default FlyoutHeader;
