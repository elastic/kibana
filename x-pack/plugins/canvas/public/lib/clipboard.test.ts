/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
jest.mock('../../../../../src/plugins/kibana_utils/public');

import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import { setClipboardData, getClipboardData } from './clipboard';
import { LOCALSTORAGE_CLIPBOARD } from '../../common/lib/constants';
import { elements } from '../../__tests__/fixtures/workpads';

const set = jest.fn();
const get = jest.fn();

describe('clipboard', () => {
  beforeAll(() => {
    // @ts-expect-error
    Storage.mockImplementation(() => ({
      set,
      get,
    }));
  });

  test('stores data to local storage', () => {
    setClipboardData(elements);

    expect(set).toBeCalledWith(LOCALSTORAGE_CLIPBOARD, JSON.stringify(elements));
  });

  test('gets data from local storage', () => {
    getClipboardData();

    expect(get).toBeCalledWith(LOCALSTORAGE_CLIPBOARD);
  });
});
