/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import type { CellValueElementProps } from '../../../../../common/types';
import { RenderCellValue } from '../../../configurations/security_solution_detections';

export const PreviewRenderCellValue: React.FC<
  EuiDataGridCellValueElementProps & CellValueElementProps
> = (props) => RenderCellValue({ ...props, enableActions: false, asPlainText: true });
