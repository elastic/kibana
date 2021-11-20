/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimerangeInput } from '../../../common/search_strategy/common';
import { ESQuery } from '../../../common/typed_json';
import { TransformConfigSchema } from '../../../common/transforms/types';
import {
  FactoryQueryTypes,
  MatrixHistogramType,
} from '../../../common/search_strategy/security_solution';

export type GetTransformChanges = ({
  factoryQueryType,
  settings,
  histogramType,
}: {
  factoryQueryType: FactoryQueryTypes;
  settings: TransformConfigSchema['settings'][0];
  histogramType?: MatrixHistogramType;
}) =>
  | {
      indices: string[];
      factoryQueryType: FactoryQueryTypes;
      histogramType?: MatrixHistogramType;
    }
  | undefined;

export type GetTransformChangesIfTheyExist = ({
  factoryQueryType,
  indices,
  filterQuery,
  histogramType,
  timerange,
}: {
  factoryQueryType: FactoryQueryTypes;
  indices: string[];
  transformSettings: TransformConfigSchema;
  filterQuery: ESQuery | string | undefined;
  histogramType?: MatrixHistogramType;
  timerange: TimerangeInput;
}) => {
  indices: string[];
  factoryQueryType: FactoryQueryTypes;
  histogramType?: MatrixHistogramType;
  timerange: TimerangeInput;
};
