/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { APP_ID } from '../../../common/constants';
import { useKibana } from '../lib/kibana';
import { useRouteSpy } from '../utils/route/use_route_spy';

/**
 * This hook utilizes useExecutionContext to make sure all outgoing requests
 * (search, saved objects) are properly traced back to a page and an entity in
 * ES, APM, and FullStory.
 */
export const useExecutionContextPropagation = () => {
  const [spyState] = useRouteSpy();
  const { executionContext } = useKibana().services;

  useExecutionContext(executionContext, {
    name: APP_ID,
    type: 'application',
    page: spyState.pageName,
  });
};
