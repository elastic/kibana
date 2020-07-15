/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act, renderHook, RenderHookResult } from '@testing-library/react-hooks';

import * as rulesApi from '../../../detections/containers/detection_engine/rules/api';
import * as listsApi from '../../../../../lists/public/exceptions/api';
import { getExceptionListSchemaMock } from '../../../../../lists/common/schemas/response/exception_list_schema.mock';
import { savedRuleMock } from '../../../detections/containers/detection_engine/rules/mock';
import { createKibanaCoreStartMock } from '../../mock/kibana_core';
import { ExceptionListType } from '../../../lists_plugin_deps';
import { ListArray } from '../../../../common/detection_engine/schemas/types';
import { getListArrayMock } from '../../../../common/detection_engine/schemas/types/lists.mock';
import {
  useFetchOrCreateRuleExceptionList,
  UseFetchOrCreateRuleExceptionListProps,
  ReturnUseFetchOrCreateRuleExceptionList,
} from './use_fetch_or_create_rule_exception_list';

const mockKibanaHttpService = createKibanaCoreStartMock().http;
jest.mock('../../../detections/containers/detection_engine/rules/api');

describe('useFetchOrCreateRuleExceptionList', () => {
  let fetchRuleById: jest.SpyInstance<ReturnType<typeof rulesApi.fetchRuleById>>;
  let patchRule: jest.SpyInstance<ReturnType<typeof rulesApi.patchRule>>;
  let addExceptionList: jest.SpyInstance<ReturnType<typeof listsApi.addExceptionList>>;
  let addEndpointExceptionList: jest.SpyInstance<ReturnType<
    typeof listsApi.addEndpointExceptionList
  >>;
  let fetchExceptionListById: jest.SpyInstance<ReturnType<typeof listsApi.fetchExceptionListById>>;
  let render: (
    listType?: UseFetchOrCreateRuleExceptionListProps['exceptionListType']
  ) => RenderHookResult<
    UseFetchOrCreateRuleExceptionListProps,
    ReturnUseFetchOrCreateRuleExceptionList
  >;
  const onError = jest.fn();
  const error = new Error('Something went wrong');
  const ruleId = 'myRuleId';
  const abortCtrl = new AbortController();
  const detectionListType: ExceptionListType = 'detection';
  const endpointListType: ExceptionListType = 'endpoint';
  const detectionExceptionList = {
    ...getExceptionListSchemaMock(),
    type: detectionListType,
  };
  const endpointExceptionList = {
    ...getExceptionListSchemaMock(),
    type: endpointListType,
  };
  const newDetectionExceptionList = {
    ...detectionExceptionList,
    name: 'new detection exception list',
  };
  const newEndpointExceptionList = {
    ...endpointExceptionList,
    name: 'new endpoint exception list',
  };
  const exceptionsListReferences: ListArray = getListArrayMock();
  const ruleWithExceptionLists = {
    ...savedRuleMock,
    exceptions_list: exceptionsListReferences,
  };
  const ruleWithoutExceptionLists = {
    ...savedRuleMock,
    exceptions_list: undefined,
  };

  beforeEach(() => {
    fetchRuleById = jest.spyOn(rulesApi, 'fetchRuleById').mockResolvedValue(ruleWithExceptionLists);

    patchRule = jest.spyOn(rulesApi, 'patchRule');

    addExceptionList = jest
      .spyOn(listsApi, 'addExceptionList')
      .mockResolvedValue(newDetectionExceptionList);

    addEndpointExceptionList = jest
      .spyOn(listsApi, 'addEndpointExceptionList')
      .mockResolvedValue(newEndpointExceptionList);

    fetchExceptionListById = jest
      .spyOn(listsApi, 'fetchExceptionListById')
      .mockResolvedValue(detectionExceptionList);

    render = (listType = detectionListType) =>
      renderHook<UseFetchOrCreateRuleExceptionListProps, ReturnUseFetchOrCreateRuleExceptionList>(
        () =>
          useFetchOrCreateRuleExceptionList({
            http: mockKibanaHttpService,
            ruleId,
            exceptionListType: listType,
            onError,
          })
      );
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('initializes hook', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = render();
      await waitForNextUpdate();
      expect(result.current).toEqual([false, null]);
    });
  });

  it('sets isLoading to true while fetching', async () => {
    await act(async () => {
      const { result, waitForNextUpdate } = render();
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(result.current).toEqual([true, null]);
    });
  });

  it('fetches the rule with the given ruleId', async () => {
    await act(async () => {
      const { waitForNextUpdate } = render();
      await waitForNextUpdate();
      await waitForNextUpdate();
      await waitForNextUpdate();
      expect(fetchRuleById).toHaveBeenCalledTimes(1);
      expect(fetchRuleById).toHaveBeenCalledWith({
        id: ruleId,
        signal: abortCtrl.signal,
      });
    });
  });

  describe('when the rule does not have exception list references', () => {
    beforeEach(() => {
      fetchRuleById = jest
        .spyOn(rulesApi, 'fetchRuleById')
        .mockResolvedValue(ruleWithoutExceptionLists);
    });

    it('does not fetch the exceptions lists', async () => {
      await act(async () => {
        const { waitForNextUpdate } = render();
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        expect(fetchExceptionListById).not.toHaveBeenCalled();
      });
    });
    it('should create a new exception list', async () => {
      await act(async () => {
        const { waitForNextUpdate } = render();
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        expect(addExceptionList).toHaveBeenCalledTimes(1);
      });
    });
    it('should update the rule', async () => {
      await act(async () => {
        const { waitForNextUpdate } = render();
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        expect(patchRule).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("when the rule has exception list references and 'detection' is passed in", () => {
    it('fetches the exceptions lists', async () => {
      await act(async () => {
        const { waitForNextUpdate } = render();
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        expect(fetchExceptionListById).toHaveBeenCalledTimes(2);
      });
    });
    it('does not create a new exception list', async () => {
      await act(async () => {
        const { waitForNextUpdate } = render();
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        expect(addExceptionList).not.toHaveBeenCalled();
      });
    });
    it('does not update the rule', async () => {
      await act(async () => {
        const { waitForNextUpdate } = render();
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        expect(patchRule).not.toHaveBeenCalled();
      });
    });
    it('should set the exception list to be the fetched list', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = render();
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        expect(result.current[1]).toEqual(detectionExceptionList);
      });
    });

    describe("but the rule does not have a reference to 'detection' type exception list", () => {
      beforeEach(() => {
        fetchExceptionListById = jest
          .spyOn(listsApi, 'fetchExceptionListById')
          .mockResolvedValue(endpointExceptionList);
      });

      it('should create a new exception list', async () => {
        await act(async () => {
          const { waitForNextUpdate } = render();
          await waitForNextUpdate();
          await waitForNextUpdate();
          await waitForNextUpdate();
          expect(addExceptionList).toHaveBeenCalledTimes(1);
        });
      });
      it('should update the rule', async () => {
        await act(async () => {
          const { waitForNextUpdate } = render();
          await waitForNextUpdate();
          await waitForNextUpdate();
          await waitForNextUpdate();
          expect(patchRule).toHaveBeenCalledTimes(1);
        });
      });
      it('should set the exception list to be the newly created list', async () => {
        await act(async () => {
          const { result, waitForNextUpdate } = render();
          await waitForNextUpdate();
          await waitForNextUpdate();
          await waitForNextUpdate();
          expect(result.current[1]).toEqual(newDetectionExceptionList);
        });
      });
    });
  });

  describe("when the rule has exception list references and 'endpoint' is passed in", () => {
    beforeEach(() => {
      fetchExceptionListById = jest
        .spyOn(listsApi, 'fetchExceptionListById')
        .mockResolvedValue(endpointExceptionList);

      addExceptionList = jest
        .spyOn(listsApi, 'addExceptionList')
        .mockResolvedValue(newEndpointExceptionList);
    });

    it('fetches the exceptions lists', async () => {
      await act(async () => {
        const { waitForNextUpdate } = render(endpointListType);
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        expect(fetchExceptionListById).toHaveBeenCalledTimes(2);
      });
    });
    it('does not create a new exception list', async () => {
      await act(async () => {
        const { waitForNextUpdate } = render(endpointListType);
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        expect(addExceptionList).not.toHaveBeenCalled();
      });
    });
    it('does not update the rule', async () => {
      await act(async () => {
        const { waitForNextUpdate } = render(endpointListType);
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        expect(patchRule).not.toHaveBeenCalled();
      });
    });
    it('should set the exception list to be the fetched list', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = render(endpointListType);
        await waitForNextUpdate();
        await waitForNextUpdate();
        await waitForNextUpdate();
        expect(result.current[1]).toEqual(endpointExceptionList);
      });
    });

    describe("but the rule does not have a reference to 'endpoint' type exception list", () => {
      beforeEach(() => {
        fetchExceptionListById = jest
          .spyOn(listsApi, 'fetchExceptionListById')
          .mockResolvedValue(detectionExceptionList);
      });

      it('should create a new exception list', async () => {
        await act(async () => {
          const { waitForNextUpdate } = render(endpointListType);
          await waitForNextUpdate();
          await waitForNextUpdate();
          await waitForNextUpdate();
          expect(addEndpointExceptionList).toHaveBeenCalledTimes(1);
        });
      });
      it('should update the rule', async () => {
        await act(async () => {
          const { waitForNextUpdate } = render(endpointListType);
          await waitForNextUpdate();
          await waitForNextUpdate();
          await waitForNextUpdate();
          expect(patchRule).toHaveBeenCalledTimes(1);
        });
      });
      it('should set the exception list to be the newly created list', async () => {
        await act(async () => {
          const { result, waitForNextUpdate } = render(endpointListType);
          await waitForNextUpdate();
          await waitForNextUpdate();
          await waitForNextUpdate();
          expect(result.current[1]).toEqual(newEndpointExceptionList);
        });
      });
    });
  });

  describe('when rule api returns an error', () => {
    beforeEach(() => {
      fetchRuleById = jest.spyOn(rulesApi, 'fetchRuleById').mockRejectedValue(error);
    });

    it('exception list should be null', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = render();
        await waitForNextUpdate();
        await waitForNextUpdate();
        expect(result.current[1]).toBeNull();
      });
    });

    it('isLoading should be false', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = render();
        await waitForNextUpdate();
        await waitForNextUpdate();
        expect(result.current[0]).toEqual(false);
      });
    });

    it('should call error callback', async () => {
      await act(async () => {
        const { waitForNextUpdate } = render();
        await waitForNextUpdate();
        await waitForNextUpdate();
        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledWith(error);
      });
    });
  });
});
