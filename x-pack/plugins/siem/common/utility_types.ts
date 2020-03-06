/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactNode } from 'react';

export type Pick3<T, K1 extends keyof T, K2 extends keyof T[K1], K3 extends keyof T[K1][K2]> = {
  [P1 in K1]: { [P2 in K2]: { [P3 in K3]: T[K1][K2][P3] } };
};

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

// This type is for typing EuiDescriptionList
export interface DescriptionList {
  title: NonNullable<ReactNode>;
  description: NonNullable<ReactNode>;
}
