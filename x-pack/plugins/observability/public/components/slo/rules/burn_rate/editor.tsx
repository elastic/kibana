/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { TIME_UNITS } from '@kbn/triggers-actions-ui-plugin/public';
import React from 'react';
import { SLOSelector } from './slo_selector';

export interface RuleParams {
  windowSize?: number;
  windowUnit?: TIME_UNITS;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Props {}

export function Editor(props: Props) {
  return (
    <>
      <SLOSelector />

      <EuiSpacer size="m" />
    </>
  );
}
