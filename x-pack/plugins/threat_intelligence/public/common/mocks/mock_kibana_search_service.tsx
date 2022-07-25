/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import * as hook from '../../hooks/use_kibana';

export const mockSearchService = (subject: Observable<unknown>) => {
  const search = jest.fn().mockReturnValue(subject);
  const showError = jest.fn();
  const getUiSetting = jest.fn();

  (hook as jest.Mocked<typeof hook>).useKibana.mockReturnValue({
    services: { data: { search: { search, showError } }, uiSettings: { get: getUiSetting } },
  } as any);

  return {
    search,
    showError,
    getUiSetting,
  };
};
