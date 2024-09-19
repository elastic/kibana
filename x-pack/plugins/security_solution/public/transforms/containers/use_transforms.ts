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
import { defaultTransformsSetting, DEFAULT_TRANSFORMS } from '../../../common/constants';
import { useUiSetting$ } from '../../common/lib/kibana';
import { getTransformChangesIfTheyExist } from '../utils';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';

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
  const [transformSettings] = useUiSetting$<TransformConfigSchema>(
    DEFAULT_TRANSFORMS,
    JSON.stringify(defaultTransformsSetting) as unknown as TransformConfigSchema // TODO: The types are not 100% correct within uiSettings$, so I have to cast here. Once that is fixed, this cast can be removed
  );
  // TODO: Once we are past experimental phase this code should be removed
  const metricsEntitiesEnabled = useIsExperimentalFeatureEnabled('metricsEntitiesEnabled');
  const [transforms, setTransforms] = useState<ReturnTransform>({
    getTransformChangesIfTheyExist: ({
      factoryQueryType,
      indices,
      filterQuery,
      histogramType,
      timerange,
    }) => {
      if (metricsEntitiesEnabled) {
        return getTransformChangesIfTheyExist({
          factoryQueryType,
          indices,
          filterQuery,
          transformSettings,
          histogramType,
          timerange,
        });
      } else {
        // TODO: Once the experimental flag is removed, then remove this return statement
        return {
          indices,
          filterQuery,
          timerange,
          factoryQueryType,
        };
      }
    },
  });

  useMemo(() => {
    setTransforms({
      getTransformChangesIfTheyExist: ({
        factoryQueryType,
        indices,
        filterQuery,
        histogramType,
        timerange,
      }) => {
        if (metricsEntitiesEnabled) {
          return getTransformChangesIfTheyExist({
            factoryQueryType,
            indices,
            transformSettings,
            filterQuery,
            histogramType,
            timerange,
          });
        } else {
          // TODO: Once the experimental flag is removed, then remove this return statement
          return {
            indices,
            filterQuery,
            timerange,
            factoryQueryType,
          };
        }
      },
    });
  }, [transformSettings, metricsEntitiesEnabled]);

  return { ...transforms };
};
