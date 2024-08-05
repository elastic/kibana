/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectOption } from '@elastic/eui';
import * as i18n from './translations';

export enum SelectedVersions {
  BaseTarget = 'base_target',
  BaseCurrent = 'base_current',
  BaseFinal = 'base_final',
  CurrentTarget = 'current_target',
  CurrentFinal = 'current_final',
  TargetFinal = 'target_final',
}

export const CURRENT_OPTIONS: EuiSelectOption[] = [
  {
    value: SelectedVersions.CurrentFinal,
    text: i18n.CURRENT_VS_FINAL,
  },
  {
    value: SelectedVersions.CurrentTarget,
    text: i18n.CURRENT_VS_TARGET,
  },
];

export const TARGET_OPTIONS: EuiSelectOption[] = [
  {
    value: SelectedVersions.TargetFinal,
    text: i18n.TARGET_VS_FINAL,
  },
];

export const BASE_OPTIONS: EuiSelectOption[] = [
  {
    value: SelectedVersions.BaseFinal,
    text: i18n.BASE_VS_FINAL,
  },
  {
    value: SelectedVersions.BaseTarget,
    text: i18n.BASE_VS_TARGET,
  },
  {
    value: SelectedVersions.BaseCurrent,
    text: i18n.BASE_VS_CURRENT,
  },
];
