/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TopAlert } from '@kbn/observability-plugin/public/pages/alerts';
import React from 'react';
export interface AlertDetailsAppSectionProps {
  alert: TopAlert;
}
export function AlertDetailsAppSection({ alert }: AlertDetailsAppSectionProps) {
  return <h1>Alert Context: {alert.reason}</h1>;
}

// eslint-disable-next-line import/no-default-export
export default AlertDetailsAppSection;
