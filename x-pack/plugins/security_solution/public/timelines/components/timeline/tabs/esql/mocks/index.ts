/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsqlInTimelineTrigger } from '../../../../../../app/actions/constants';
export { MockEsqlTabContent } from './esql_tab_content';

export const mockApplyFilterTrigger = {
  exec: jest.fn().mockResolvedValue(undefined),
};

export const mockPreventDefault = jest.fn();

export const mockUIActionsGetTrigger = jest.fn().mockImplementation((triggerName: string) => {
  switch (triggerName) {
    case EsqlInTimelineTrigger.HISTOGRAM_TRIGGER:
      return mockApplyFilterTrigger;
    default:
      return undefined;
  }
});
