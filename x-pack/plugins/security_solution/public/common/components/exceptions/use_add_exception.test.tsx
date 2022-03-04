/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook, RenderHookResult } from '@testing-library/react-hooks';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { KibanaServices } from '../../../common/lib/kibana';

import * as alertsApi from '../../../detections/containers/detection_engine/alerts/api';
import * as listsApi from '@kbn/securitysolution-list-api';
import * as getQueryFilterHelper from '../../../../common/detection_engine/get_query_filter';
import * as buildFilterHelpers from '../../../detections/components/alerts_table/default_config';
import { getExceptionListItemSchemaMock } from '../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { getCreateExceptionListItemSchemaMock } from '../../../../../lists/common/schemas/request/create_exception_list_item_schema.mock';
import { getUpdateExceptionListItemSchemaMock } from '../../../../../lists/common/schemas/request/update_exception_list_item_schema.mock';
import type {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
  UpdateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { TestProviders } from '../../mock';
import {
  useAddOrUpdateException,
  UseAddOrUpdateExceptionProps,
  ReturnUseAddOrUpdateException,
  AddOrUpdateExceptionItemsFunc,
} from './use_add_exception';

const mockKibanaHttpService = coreMock.createStart().http;
const mockKibanaServices = KibanaServices.get as jest.Mock;
jest.mock('../../../common/lib/kibana');
jest.mock('@kbn/securitysolution-list-api');

const fetchMock = jest.fn();
mockKibanaServices.mockReturnValue({ http: { fetch: fetchMock } });

describe('useAddOrUpdateException', () => {
  let updateAlertStatus: jest.SpyInstance<Promise<estypes.UpdateByQueryResponse>>;
  let addExceptionListItem: jest.SpyInstance<Promise<ExceptionListItemSchema>>;
  let updateExceptionListItem: jest.SpyInstance<Promise<ExceptionListItemSchema>>;
  let getQueryFilter: jest.SpyInstance<ReturnType<typeof getQueryFilterHelper.getQueryFilter>>;
  let buildAlertStatusesFilter: jest.SpyInstance<
    ReturnType<typeof buildFilterHelpers.buildAlertStatusesFilter>
  >;
  let buildAlertsFilter: jest.SpyInstance<ReturnType<typeof buildFilterHelpers.buildAlertsFilter>>;
  let addOrUpdateItemsArgs: Parameters<AddOrUpdateExceptionItemsFunc>;
  let render: () => RenderHookResult<UseAddOrUpdateExceptionProps, ReturnUseAddOrUpdateException>;
  const onError = jest.fn();
  const onSuccess = jest.fn();
  const ruleStaticId = 'rule-id';
  const alertIdToClose = 'idToClose';
  const bulkCloseIndex = ['.custom'];
  const itemsToAdd: CreateExceptionListItemSchema[] = [
    {
      ...getCreateExceptionListItemSchemaMock(),
      name: 'item to add 1',
    },
    {
      ...getCreateExceptionListItemSchemaMock(),
      name: 'item to add 2',
    },
  ];
  const itemsToUpdate: ExceptionListItemSchema[] = [
    {
      ...getExceptionListItemSchemaMock(),
      name: 'item to update 1',
    },
    {
      ...getExceptionListItemSchemaMock(),
      name: 'item to update 2',
    },
  ];
  const itemsToUpdateFormatted: UpdateExceptionListItemSchema[] = itemsToUpdate.map(
    (item: ExceptionListItemSchema) => {
      const formatted: UpdateExceptionListItemSchema = getUpdateExceptionListItemSchemaMock();
      const newObj = (Object.keys(formatted) as Array<keyof UpdateExceptionListItemSchema>).reduce(
        (acc, key) => {
          return {
            ...acc,
            [key]: item[key],
          };
        },
        {} as UpdateExceptionListItemSchema
      );
      return newObj;
    }
  );

  const itemsToAddOrUpdate = [...itemsToAdd, ...itemsToUpdate];

  const waitForAddOrUpdateFunc: (arg: {
    waitForNextUpdate: RenderHookResult<
      UseAddOrUpdateExceptionProps,
      ReturnUseAddOrUpdateException
    >['waitForNextUpdate'];
    rerender: RenderHookResult<
      UseAddOrUpdateExceptionProps,
      ReturnUseAddOrUpdateException
    >['rerender'];
    result: RenderHookResult<UseAddOrUpdateExceptionProps, ReturnUseAddOrUpdateException>['result'];
  }) => Promise<ReturnUseAddOrUpdateException[1]> = async ({
    waitForNextUpdate,
    rerender,
    result,
  }) => {
    await waitForNextUpdate();
    rerender();
    expect(result.current[1]).not.toBeNull();
    return Promise.resolve(result.current[1]);
  };

  beforeEach(() => {
    updateAlertStatus = jest.spyOn(alertsApi, 'updateAlertStatus');

    addExceptionListItem = jest
      .spyOn(listsApi, 'addExceptionListItem')
      .mockResolvedValue(getExceptionListItemSchemaMock());

    updateExceptionListItem = jest
      .spyOn(listsApi, 'updateExceptionListItem')
      .mockResolvedValue(getExceptionListItemSchemaMock());

    getQueryFilter = jest.spyOn(getQueryFilterHelper, 'getQueryFilter');

    buildAlertStatusesFilter = jest.spyOn(buildFilterHelpers, 'buildAlertStatusesFilter');

    buildAlertsFilter = jest.spyOn(buildFilterHelpers, 'buildAlertsFilter');

    addOrUpdateItemsArgs = [ruleStaticId, itemsToAddOrUpdate];
    render = () =>
      renderHook<UseAddOrUpdateExceptionProps, ReturnUseAddOrUpdateException>(
        () =>
          useAddOrUpdateException({
            http: mockKibanaHttpService,
            onError,
            onSuccess,
          }),
        {
          wrapper: TestProviders,
        }
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
      expect(result.current).toEqual([{ isLoading: false }, result.current[1]]);
    });
  });

  it('invokes "onError" if call to add exception item fails', async () => {
    const mockError = new Error('error adding item');

    addExceptionListItem = jest
      .spyOn(listsApi, 'addExceptionListItem')
      .mockRejectedValue(mockError);

    await act(async () => {
      const { rerender, result, waitForNextUpdate } = render();
      const addOrUpdateItems = await waitForAddOrUpdateFunc({
        rerender,
        result,
        waitForNextUpdate,
      });
      if (addOrUpdateItems) {
        addOrUpdateItems(...addOrUpdateItemsArgs);
      }
      await waitForNextUpdate();
      expect(onError).toHaveBeenCalledWith(mockError, null, null);
    });
  });

  it('invokes "onError" if call to update exception item fails', async () => {
    const mockError = new Error('error updating item');

    updateExceptionListItem = jest
      .spyOn(listsApi, 'updateExceptionListItem')
      .mockRejectedValue(mockError);

    await act(async () => {
      const { rerender, result, waitForNextUpdate } = render();
      const addOrUpdateItems = await waitForAddOrUpdateFunc({
        rerender,
        result,
        waitForNextUpdate,
      });
      if (addOrUpdateItems) {
        addOrUpdateItems(...addOrUpdateItemsArgs);
      }
      await waitForNextUpdate();
      expect(onError).toHaveBeenCalledWith(mockError, null, null);
    });
  });

  describe('when alertIdToClose is not passed in', () => {
    it('should not update the alert status', async () => {
      await act(async () => {
        const { rerender, result, waitForNextUpdate } = render();
        const addOrUpdateItems = await waitForAddOrUpdateFunc({
          rerender,
          result,
          waitForNextUpdate,
        });
        if (addOrUpdateItems) {
          addOrUpdateItems(...addOrUpdateItemsArgs);
        }
        await waitForNextUpdate();
        expect(updateAlertStatus).not.toHaveBeenCalled();
      });
    });

    it('creates new items', async () => {
      await act(async () => {
        const { rerender, result, waitForNextUpdate } = render();
        const addOrUpdateItems = await waitForAddOrUpdateFunc({
          rerender,
          result,
          waitForNextUpdate,
        });
        if (addOrUpdateItems) {
          addOrUpdateItems(...addOrUpdateItemsArgs);
        }
        await waitForNextUpdate();
        expect(addExceptionListItem).toHaveBeenCalledTimes(2);
        expect(addExceptionListItem.mock.calls[1][0].listItem).toEqual(itemsToAdd[1]);
      });
    });
    it('updates existing items', async () => {
      await act(async () => {
        const { rerender, result, waitForNextUpdate } = render();
        const addOrUpdateItems = await waitForAddOrUpdateFunc({
          rerender,
          result,
          waitForNextUpdate,
        });
        if (addOrUpdateItems) {
          addOrUpdateItems(...addOrUpdateItemsArgs);
        }
        await waitForNextUpdate();
        expect(updateExceptionListItem).toHaveBeenCalledTimes(2);
        expect(updateExceptionListItem.mock.calls[1][0].listItem).toEqual(
          itemsToUpdateFormatted[1]
        );
      });
    });
  });

  describe('when alertIdToClose is passed in', () => {
    beforeEach(() => {
      addOrUpdateItemsArgs = [ruleStaticId, itemsToAddOrUpdate, alertIdToClose];
    });
    it('should update the alert status', async () => {
      await act(async () => {
        const { rerender, result, waitForNextUpdate } = render();
        const addOrUpdateItems = await waitForAddOrUpdateFunc({
          rerender,
          result,
          waitForNextUpdate,
        });
        if (addOrUpdateItems) {
          addOrUpdateItems(...addOrUpdateItemsArgs);
        }
        await waitForNextUpdate();
        expect(updateAlertStatus).toHaveBeenCalledTimes(1);
      });
    });
    it('creates new items', async () => {
      await act(async () => {
        const { rerender, result, waitForNextUpdate } = render();
        const addOrUpdateItems = await waitForAddOrUpdateFunc({
          rerender,
          result,
          waitForNextUpdate,
        });
        if (addOrUpdateItems) {
          addOrUpdateItems(...addOrUpdateItemsArgs);
        }
        await waitForNextUpdate();
        expect(addExceptionListItem).toHaveBeenCalledTimes(2);
        expect(addExceptionListItem.mock.calls[1][0].listItem).toEqual(itemsToAdd[1]);
      });
    });
    it('updates existing items', async () => {
      await act(async () => {
        const { rerender, result, waitForNextUpdate } = render();
        const addOrUpdateItems = await waitForAddOrUpdateFunc({
          rerender,
          result,
          waitForNextUpdate,
        });
        if (addOrUpdateItems) {
          addOrUpdateItems(...addOrUpdateItemsArgs);
        }
        await waitForNextUpdate();
        expect(updateExceptionListItem).toHaveBeenCalledTimes(2);
        expect(updateExceptionListItem.mock.calls[1][0].listItem).toEqual(
          itemsToUpdateFormatted[1]
        );
      });
    });
  });

  describe('when bulkCloseIndex is passed in', () => {
    beforeEach(() => {
      addOrUpdateItemsArgs = [ruleStaticId, itemsToAddOrUpdate, undefined, bulkCloseIndex];
    });
    it('should update the status of only alerts that are open', async () => {
      await act(async () => {
        const { rerender, result, waitForNextUpdate } = render();
        const addOrUpdateItems = await waitForAddOrUpdateFunc({
          rerender,
          result,
          waitForNextUpdate,
        });
        if (addOrUpdateItems) {
          addOrUpdateItems(...addOrUpdateItemsArgs);
        }
        await waitForNextUpdate();
        expect(buildAlertStatusesFilter).toHaveBeenCalledTimes(1);
        expect(buildAlertStatusesFilter.mock.calls[0][0]).toEqual([
          'open',
          'acknowledged',
          'in-progress',
        ]);
      });
    });
    it('should update the status of only alerts generated by the provided rule', async () => {
      await act(async () => {
        const { rerender, result, waitForNextUpdate } = render();
        const addOrUpdateItems = await waitForAddOrUpdateFunc({
          rerender,
          result,
          waitForNextUpdate,
        });
        if (addOrUpdateItems) {
          addOrUpdateItems(...addOrUpdateItemsArgs);
        }
        await waitForNextUpdate();
        expect(buildAlertsFilter).toHaveBeenCalledTimes(1);
        expect(buildAlertsFilter.mock.calls[0][0]).toEqual(ruleStaticId);
      });
    });
    it('should generate the query filter using exceptions', async () => {
      await act(async () => {
        const { rerender, result, waitForNextUpdate } = render();
        const addOrUpdateItems = await waitForAddOrUpdateFunc({
          rerender,
          result,
          waitForNextUpdate,
        });
        if (addOrUpdateItems) {
          addOrUpdateItems(...addOrUpdateItemsArgs);
        }
        await waitForNextUpdate();
        expect(getQueryFilter).toHaveBeenCalledTimes(1);
        expect(getQueryFilter.mock.calls[0][4]).toEqual(itemsToAddOrUpdate);
        expect(getQueryFilter.mock.calls[0][5]).toEqual(false);
      });
    });
    it('should update the alert status', async () => {
      await act(async () => {
        const { rerender, result, waitForNextUpdate } = render();
        const addOrUpdateItems = await waitForAddOrUpdateFunc({
          rerender,
          result,
          waitForNextUpdate,
        });
        if (addOrUpdateItems) {
          addOrUpdateItems(...addOrUpdateItemsArgs);
        }
        await waitForNextUpdate();
        expect(updateAlertStatus).toHaveBeenCalledTimes(1);
      });
    });
    it('creates new items', async () => {
      await act(async () => {
        const { rerender, result, waitForNextUpdate } = render();
        const addOrUpdateItems = await waitForAddOrUpdateFunc({
          rerender,
          result,
          waitForNextUpdate,
        });
        if (addOrUpdateItems) {
          addOrUpdateItems(...addOrUpdateItemsArgs);
        }
        await waitForNextUpdate();
        expect(addExceptionListItem).toHaveBeenCalledTimes(2);
        expect(addExceptionListItem.mock.calls[1][0].listItem).toEqual(itemsToAdd[1]);
      });
    });
    it('updates existing items', async () => {
      await act(async () => {
        const { rerender, result, waitForNextUpdate } = render();
        const addOrUpdateItems = await waitForAddOrUpdateFunc({
          rerender,
          result,
          waitForNextUpdate,
        });
        if (addOrUpdateItems) {
          addOrUpdateItems(...addOrUpdateItemsArgs);
        }
        await waitForNextUpdate();
        expect(updateExceptionListItem).toHaveBeenCalledTimes(2);
        expect(updateExceptionListItem.mock.calls[1][0].listItem).toEqual(
          itemsToUpdateFormatted[1]
        );
      });
    });
  });
});
