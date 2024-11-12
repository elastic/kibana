/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { addUpdatedField, useFilterUpdate } from './use_filter_update';
import * as params from './use_url_params';

describe('useFilterUpdate', () => {
  describe('useFilterUpdate hook', () => {
    let getUrlParamsSpy;
    let updateUrlSpy: jest.Mock;

    beforeEach(() => {
      getUrlParamsSpy = jest.fn().mockReturnValue({
        filters: '[["testField",["tag1"]]]',
        excludedFilters: '[["testField",["tag2"]]]',
      });
      updateUrlSpy = jest.fn();
      jest.spyOn(params, 'useUrlParams').mockReturnValue([getUrlParamsSpy, updateUrlSpy]);
    });

    it('does not update url when filters have not been updated', () => {
      renderHook(() => useFilterUpdate('testField', ['tag1'], ['tag2']));
      expect(updateUrlSpy).not.toBeCalled();
    });

    it('does update url when filters have been updated', () => {
      renderHook(() => useFilterUpdate('testField', ['tag1', 'tag2'], []));
      expect(updateUrlSpy).toBeCalledWith({
        filters: '[["testField",["tag1","tag2"]]]',
        excludedFilters: '',
        pagination: '',
      });
    });
  });

  describe('addUpdatedField', () => {
    it('conditionally adds fields if they are new', () => {
      const testVal = {};
      addUpdatedField('a val', 'newField', 'a new val', testVal);
      expect(testVal).toEqual({
        newField: 'a new val',
      });
    });

    it('will add a field if the value is the same but not the default', () => {
      const testVal = {};
      addUpdatedField('a val', 'newField', 'a val', testVal);
      expect(testVal).toEqual({ newField: 'a val' });
    });

    it(`won't add a field if the current value is empty`, () => {
      const testVal = {};
      addUpdatedField('', 'newField', '', testVal);
      expect(testVal).toEqual({});
    });
  });
});
