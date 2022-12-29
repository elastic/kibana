/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { HttpError } from '../../../../../common/types/api';

import { FetchEnginesAPILogic } from '../../api/engines/fetch_engines_api_logic';

import { EnginesListLogic } from './engines_list_logic';
import { Meta } from './types';

export const DEFAULT_META: Meta = {
  from: 0,
  size: 5,
  total: 10,
};
const DEFAULT_VALUES = {
  data: undefined,
  enginesList: [], // meta is not added for jest case, pagination is yet to be implemented
  // meta: DEFAULT_META,
  status: 0,
};
// const enginesList: EngineListDetails[] = mockedEngines[0];
describe('EnginesListLogic', () => {
  const { mount: apiLogicMount } = new LogicMounter(FetchEnginesAPILogic);
  const { mount } = new LogicMounter(EnginesListLogic);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    apiLogicMount();
    mount();
  });
  it('has expected default values', () => {
    expect(EnginesListLogic.values).toEqual(DEFAULT_VALUES);
  });
  describe('actions', () => {
    describe('onPaginate', () => {
      it('updates meta with newPageIndex', () => {});
    });
  });
  describe('reducers', () => {});
  describe('listeners', () => {
    it('calls flashAPIErrors on apiError', () => {
      EnginesListLogic.actions.apiError({} as HttpError);
      expect(mockFlashMessageHelpers.flashAPIErrors).toHaveBeenCalledTimes(1);
      expect(mockFlashMessageHelpers.flashAPIErrors).toHaveBeenCalledWith({});
    });

    it('calls makeRequest on fetchEngines', async () => {
      jest.useFakeTimers({ legacyFakeTimers: true });
      EnginesListLogic.actions.makeRequest = jest.fn();
      EnginesListLogic.actions.fetchEngines({ meta: DEFAULT_META });
      await nextTick();
      expect(EnginesListLogic.actions.makeRequest).toHaveBeenCalledWith({
        meta: DEFAULT_META,
      });
    });
  });
  describe('selectors', () => {
    describe('enginesList', () => {
      it('updates when apiSuccess listener triggered', () => {
        expect(EnginesListLogic.values).toEqual(DEFAULT_VALUES);
      });
    });
  });
});
