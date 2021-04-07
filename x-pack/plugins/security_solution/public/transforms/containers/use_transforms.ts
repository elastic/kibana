/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo, useState } from 'react';
import { ESQuery } from '../../../common/typed_json';
import {
  FactoryQueryTypes,
  MatrixHistogramType,
  TimerangeInput,
} from '../../../common/search_strategy';
import { TransformConfigSchema } from '../../../common/transforms/types';
import { DEFAULT_TRANSFORMS } from '../../../common/constants';
import { useUiSetting$ } from '../../common/lib/kibana';
import { getTransformChangesIfTheyExist } from '../utils';

export type TransformChangesIfTheyExist = ({
  factoryQueryType,
  indices,
  filterQuery,
  histogramType,
  timerange,
}: {
  factoryQueryType: FactoryQueryTypes;
  indices: string[];
  filterQuery: ESQuery | string | undefined;
  histogramType?: MatrixHistogramType;
  timerange: TimerangeInput;
}) => {
  indices: string[];
  factoryQueryType: FactoryQueryTypes;
  histogramType?: MatrixHistogramType;
  timerange: TimerangeInput;
};

export interface ReturnTransform {
  getTransformChangesIfTheyExist: TransformChangesIfTheyExist;
}

export const useTransforms = (): ReturnTransform => {
  const [transformSettings] = useUiSetting$<TransformConfigSchema>(DEFAULT_TRANSFORMS);
  const [transforms, setTransforms] = useState<ReturnTransform>({
    getTransformChangesIfTheyExist: ({
      factoryQueryType,
      indices,
      filterQuery,
      histogramType,
      timerange,
    }) =>
      getTransformChangesIfTheyExist({
        factoryQueryType,
        indices,
        filterQuery,
        transformSettings,
        histogramType,
        timerange,
      }),
  });

  useMemo(() => {
    setTransforms({
      getTransformChangesIfTheyExist: ({
        factoryQueryType,
        indices,
        filterQuery,
        histogramType,
        timerange,
      }) =>
        getTransformChangesIfTheyExist({
          factoryQueryType,
          indices,
          transformSettings,
          filterQuery,
          histogramType,
          timerange,
        }),
    });
  }, [transformSettings]);

  return { ...transforms };
};
