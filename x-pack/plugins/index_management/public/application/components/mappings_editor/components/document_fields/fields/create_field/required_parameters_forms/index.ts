/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentType } from 'react';
import { TYPE_DEFINITION } from '../../../../../constants';
import { MainType, SubType, DataType, NormalizedFields } from '../../../../../types';

import { AliasTypeRequiredParameters } from './alias_type';
import { TokenCountTypeRequiredParameters } from './token_count_type';
import { ScaledFloatTypeRequiredParameters } from './scaled_float_type';
import { DenseVectorRequiredParameters } from './dense_vector_type';

export interface ComponentProps {
  allFields: NormalizedFields['byId'];
}

const typeToParametersFormMap: { [key in DataType]?: ComponentType<any> } = {
  alias: AliasTypeRequiredParameters,
  token_count: TokenCountTypeRequiredParameters,
  scaled_float: ScaledFloatTypeRequiredParameters,
  dense_vector: DenseVectorRequiredParameters,
};

export const getRequiredParametersFormForType = (
  type: MainType,
  subType?: SubType
): ComponentType<ComponentProps> | undefined => {
  const typeDefinition = TYPE_DEFINITION[type];

  if (subType) {
    return typeDefinition.subTypes?.types.includes(subType)
      ? typeToParametersFormMap[subType]
      : undefined;
  }

  return typeToParametersFormMap[type];
};
