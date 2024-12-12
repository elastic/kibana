/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectOption } from '@elastic/eui';
import * as i18n from './translations';

export enum Version {
  Base = 'base',
  Current = 'current',
  Target = 'target',
  Final = 'final',
}

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
    text: i18n.VERSION1_VS_VERSION2(i18n.CURRENT_VERSION, i18n.FINAL_VERSION),
  },
  {
    value: SelectedVersions.CurrentTarget,
    text: i18n.VERSION1_VS_VERSION2(i18n.CURRENT_VERSION, i18n.TARGET_VERSION),
  },
];

export const TARGET_OPTIONS: EuiSelectOption[] = [
  {
    value: SelectedVersions.TargetFinal,
    text: i18n.VERSION1_VS_VERSION2(i18n.TARGET_VERSION, i18n.FINAL_VERSION),
  },
];

export const BASE_OPTIONS: EuiSelectOption[] = [
  {
    value: SelectedVersions.BaseFinal,
    text: i18n.VERSION1_VS_VERSION2(i18n.BASE_VERSION, i18n.FINAL_VERSION),
  },
  {
    value: SelectedVersions.BaseTarget,
    text: i18n.VERSION1_VS_VERSION2(i18n.BASE_VERSION, i18n.TARGET_VERSION),
  },
  {
    value: SelectedVersions.BaseCurrent,
    text: i18n.VERSION1_VS_VERSION2(i18n.BASE_VERSION, i18n.CURRENT_VERSION),
  },
];
