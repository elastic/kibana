/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ComponentType } from 'react';
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

export const getParametersFormForType = (
  type: MainType,
  subType?: SubType
): ComponentType<ComponentProps> | undefined =>
  typeToParametersFormMap[subType as DataType] || typeToParametersFormMap[type];
