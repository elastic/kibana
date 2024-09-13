/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiTokenProps } from '@elastic/eui';
import { FieldIcon as KbnFieldIcon } from '@kbn/react-field';

// Remappings from type to a supported `FieldIcon` type
const typeToFieldIconType: Partial<Record<string, string>> = {
  integer: 'number',
};

// Mappings for types missing from `FieldIcon`
const typeToEuiIconMap: Partial<Record<string, EuiTokenProps>> = {
  object: { color: 'euiColorVis3', iconType: 'tokenObject' },
};

export interface FieldIconProps {
  type: string;
}

export const FieldIcon: React.FC<FieldIconProps> = (props) => {
  const type = typeToFieldIconType[props.type] || props.type;
  const overrides = typeToEuiIconMap[type] || {};
  return <KbnFieldIcon type={type} {...overrides} />;
};
