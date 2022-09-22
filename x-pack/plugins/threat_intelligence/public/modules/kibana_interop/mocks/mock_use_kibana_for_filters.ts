/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { Filter } from '../../../../private/var/tmp/_bazel_maxcold/fce807b6c2551c4f3f2c619f16f76292/execroot/kibana/bazel-out/darwin_arm64-fastbuild/bin/packages/kbn-es-query/npm_module_types';
import * as hook from '../hooks/use_kibana';

jest.mock('../../hooks/use_kibana');

interface MockConfig {
  $filterUpdates?: BehaviorSubject<void>;
  getFilters?: jest.Mock<Filter[]>;
  setFilters?: jest.Mock<any, Filter[]>;
}

const defaultConfig = {
  $filterUpdates: new BehaviorSubject<void>(undefined),
  getFilters: jest.fn().mockReturnValue([]),
  setFilters: jest.fn(),
};

export const mockUseKibanaForFilters = ({
  $filterUpdates = defaultConfig.$filterUpdates,
  getFilters = defaultConfig.getFilters,
  setFilters = defaultConfig.setFilters,
}: MockConfig = defaultConfig) => {
  const getFieldsForWildcard = jest.fn();

  (hook as jest.Mocked<typeof hook>).useKibana.mockReturnValue({
    services: {
      data: {
        query: {
          filterManager: {
            getFilters,
            setFilters,
            getUpdates$: () => $filterUpdates,
          },
        },
      },
      dataViews: { getFieldsForWildcard },
    },
  } as any);

  return { getFieldsForWildcard, setFilters, getFilters, $filterUpdates };
};
