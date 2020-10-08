/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiComboBoxOptionOption } from '@elastic/eui';

import { OperatorEnum, OperatorTypeEnum } from '../../../lists_plugin_deps';

export interface GetGenericComboBoxPropsReturn {
  comboOptions: EuiComboBoxOptionOption[];
  labels: string[];
  selectedComboOptions: EuiComboBoxOptionOption[];
}

export interface OperatorOption {
  message: string;
  value: string;
  operator: OperatorEnum;
  type: OperatorTypeEnum;
}
