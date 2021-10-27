/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RuntimeFieldStrategyRequest,
  RuntimeFieldStrategyResponse,
} from '../../../../../timelines/common';
import { DataPublicPluginStart } from '../../../../../../../src/plugins/data/public';

export const getRuntimeFieldSearch = ({
  data,
  dataViewId,
  fieldName,
}: GetRuntimeFieldProps): Promise<RuntimeFieldStrategyResponse> =>
  data.search
    .search<RuntimeFieldStrategyRequest, RuntimeFieldStrategyResponse>(
      {
        dataViewId,
        fieldName,
      },
      {
        strategy: 'runtimeField',
      }
    )
    .toPromise();

type GetRuntimeFieldProps = RuntimeFieldStrategyRequest & {
  data: DataPublicPluginStart;
};
