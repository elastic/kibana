/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook } from '@testing-library/react-hooks';

import { coreMock } from '../../../../../../../../src/core/public/mocks';

import * as api from './api';
import { ruleMock } from './mock';
import {
  ReturnUseDissasociateExceptionList,
  UseDissasociateExceptionListProps,
  useDissasociateExceptionList,
} from './use_dissasociate_exception_list';

const mockKibanaHttpService = coreMock.createStart().http;

describe('useDissasociateExceptionList', () => {
  const onError = jest.fn();
  const onSuccess = jest.fn();

  beforeEach(() => {
    jest.spyOn(api, 'patchRule').mockResolvedValue(ruleMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('initializes hook', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = renderHook<
        UseDissasociateExceptionListProps,
        ReturnUseDissasociateExceptionList
      >(() =>
        useDissasociateExceptionList({
          http: mockKibanaHttpService,
          ruleRuleId: 'rule_id',
          onError,
          onSuccess,
        })
      );

      await waitForNextUpdate();

      expect(result.current).toEqual([false, null]);
    });
  });
});
