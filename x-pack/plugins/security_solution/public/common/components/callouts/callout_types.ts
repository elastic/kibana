/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCallOutProps } from '@elastic/eui';

export type CallOutType = NonNullable<EuiCallOutProps['color']>;

export interface CallOutMessage {
  type: CallOutType;
  id: string;
  title: string;
  description: JSX.Element;
}
