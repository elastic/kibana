/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { ReactNode } from 'react';
import { PackagePolicyConfigRecordEntry } from '../../../../../fleet/common';

export type {
  PackagePolicyCreateExtensionComponentProps,
  PackagePolicyEditExtensionComponentProps,
} from '../../../../../fleet/public';

export type {
  NewPackagePolicy,
  PackagePolicy,
  PackagePolicyConfigRecordEntry,
} from '../../../../../fleet/common';

export type PackagePolicyVars = Record<string, PackagePolicyConfigRecordEntry>;

export type SettingValidation = t.Type<any, string, unknown>;

interface AdvancedSettingRow {
  type: 'advanced_setting';
  settings: SettingsRow[];
}

export interface BasicSettingRow {
  type:
    | 'text'
    | 'combo'
    | 'area'
    | 'boolean'
    | 'integer'
    | 'bytes'
    | 'duration'
    | 'yaml';
  key: string;
  rowTitle?: string;
  rowDescription?: string;
  label?: string;
  helpText?: ReactNode;
  placeholder?: string;
  labelAppend?: string;
  labelAppendLink?: string;
  labelAppendLinkText?: string;
  settings?: SettingsRow[];
  validation?: SettingValidation;
  required?: boolean;
}

export type SettingsRow = BasicSettingRow | AdvancedSettingRow;
