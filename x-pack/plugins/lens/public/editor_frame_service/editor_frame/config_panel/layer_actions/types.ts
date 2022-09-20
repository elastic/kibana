/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IconType, EuiButtonIconColor } from '@elastic/eui';

/** @internal **/
export interface LayerAction {
  displayName: string;
  execute: () => void | Promise<void>;
  icon: IconType;
  color?: EuiButtonIconColor;
  isCompatible: boolean;
  'data-test-subj'?: string;
}
