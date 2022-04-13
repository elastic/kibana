/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ControlColumnProps } from '../../../../../common/types';
import { HeaderCheckBox, RowCheckBox } from './checkbox';

export const checkBoxControlColumn: ControlColumnProps = {
  id: 'checkbox-control-column',
  width: 32,
  headerCellRender: HeaderCheckBox,
  rowCellRender: RowCheckBox,
};
