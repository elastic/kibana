/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FieldIcon, FieldIconProps } from '@kbn/react-field';
import { DataType } from '../types';
import { normalizeOperationDataType } from './pure_utils';

export function LensFieldIcon({ type, ...rest }: FieldIconProps & { type: DataType }) {
  return (
    <FieldIcon
      className="lnsFieldListPanel__fieldIcon"
      type={normalizeOperationDataType(type)}
      {...rest}
    />
  );
}
