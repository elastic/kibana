/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { PackagePolicyConfigRecordEntry } from '../../../../../fleet/common';

export {
  PackagePolicyCreateExtensionComponentProps,
  PackagePolicyEditExtensionComponentProps,
} from '../../../../../fleet/public';

export {
  NewPackagePolicy,
  PackagePolicy,
  PackagePolicyConfigRecordEntry,
} from '../../../../../fleet/common';

export type PackagePolicyVars = Record<string, PackagePolicyConfigRecordEntry>;

export type SettingValidation = t.Type<any, string, unknown>;

interface AdvancedSetting {
  type: 'advanced_setting';
  settings: Setting[];
}

export interface BasicSetting {
  type:
    | 'text'
    | 'combo'
    | 'area'
    | 'boolean'
    | 'integer'
    | 'bytes'
    | 'duration';
  key: string;
  rowTitle?: string;
  rowDescription?: string;
  label?: string;
  helpText?: string;
  placeholder?: string;
  labelAppend?: string;
  settings?: Setting[];
  validation?: SettingValidation;
  required?: boolean;
  readOnly?: boolean;
}

export type Setting = BasicSetting | AdvancedSetting;
