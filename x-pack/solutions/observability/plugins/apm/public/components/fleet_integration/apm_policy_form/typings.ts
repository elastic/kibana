/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { z } from '@kbn/zod/v4';
import type { ReactNode } from 'react';
import type { PackagePolicyConfigRecordEntry } from '@kbn/fleet-plugin/common';

export type {
  PackagePolicyCreateExtensionComponentProps,
  PackagePolicyEditExtensionComponentProps,
} from '@kbn/fleet-plugin/public';

export type {
  NewPackagePolicy,
  PackagePolicy,
  PackagePolicyConfigRecordEntry,
} from '@kbn/fleet-plugin/common';

export type PackagePolicyVars = Record<string, PackagePolicyConfigRecordEntry>;

export type SettingValidation = z.ZodTypeAny;

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
    | 'storageSize'
    | 'duration'
    | 'yaml'
    | 'secret';
  key: string;
  rowTitle?: string;
  rowDescription?: string;
  label?: string;
  helpText?: ReactNode;
  placeholder?: string;
  labelAppend?: string;
  labelAppendLink?: string;
  labelAppendLinkText?: string;
  dataTestSubj?: string;
  settings?: SettingsRow[];
  validation?: SettingValidation;
  required?: boolean;
}

export type SettingsRow = BasicSettingRow | AdvancedSettingRow;
