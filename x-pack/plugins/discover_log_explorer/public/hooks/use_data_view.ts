/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import { createStateContainerReactHelpers } from '@kbn/kibana-utils-plugin/common';

export const { Provider: InternalStateProvider, useSelector: useInternalStateSelector } =
  createStateContainerReactHelpers<DiscoverStateContainer['internalState']>();

export const useDataView = () => useInternalStateSelector((state) => state.dataView!);
