/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFilterManagerMock } from '@kbn/data-plugin/public/query/filter_manager/filter_manager.mock';

import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';

export const createServicesMock = () => {
  const services = createStartServicesMock();

  const mockTimelineFilterManager = createFilterManagerMock();

  return {
    ...services,
    timelineFilterManager: mockTimelineFilterManager,
  };
};
