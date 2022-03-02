/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConfigKey, MonitorFields } from '../runtime_types';

export type Validator = (config: Partial<MonitorFields>) => boolean;
export type NamespaceValidator = (config: Partial<MonitorFields>) => false | string;

export type ConfigValidation = Omit<Record<ConfigKey, Validator>, ConfigKey.NAMESPACE> &
  Record<ConfigKey.NAMESPACE, NamespaceValidator>;

export type Validation = Partial<ConfigValidation>;
