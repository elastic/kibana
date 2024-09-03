/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';

import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { searchServiceMock } from '@kbn/data-plugin/public/search/mocks';

import { validateEql } from './api';
import {
  getEqlResponseWithMappingError,
  getEqlResponseWithNonValidationError,
  getEqlResponseWithParsingError,
  getEqlResponseWithValidationError,
  getEqlResponseWithValidationErrors,
} from '../../../../common/search_strategy/eql/validation/helpers.mock';

const searchMock = searchServiceMock.createStartContract();

const mockDataService = {
  ...dataPluginMock.createStartContract(),
  search: searchMock,
};

const triggerValidateEql = () => {
  const signal = new AbortController().signal;
  return validateEql({
    data: mockDataService,
    dataViewTitle: 'logs-*',
    query: 'any where true',
    signal,
    runtimeMappings: undefined,
    options: undefined,
  });
};

describe('validateEql', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handle EqlSearchStrategyResponse', () => {
    it('should return valid set to true if validation response is not an error', async () => {
      searchMock.search.mockImplementation(() => of({ rawResponse: 'Successful validation!' }));
      const response = await triggerValidateEql();

      expect(response).toEqual({ valid: true });
    });

    it('should return EQL_ERR_INVALID_EQL error in case of `verification_exception` error', async () => {
      searchMock.search.mockImplementation(() =>
        of({ rawResponse: getEqlResponseWithValidationError() })
      );
      const response = await triggerValidateEql();

      expect(response).toEqual({
        valid: false,
        error: {
          code: 'EQL_ERR_INVALID_EQL',
          messages: [
            'Found 2 problems\nline 1:1: Unknown column [event.category]\nline 1:13: Unknown column [event.name]',
          ],
        },
      });
    });

    it('should return EQL_ERR_INVALID_EQL error in case of multiple `verification_exception` errors', async () => {
      searchMock.search.mockImplementation(() =>
        of({ rawResponse: getEqlResponseWithValidationErrors() })
      );
      const response = await triggerValidateEql();

      expect(response).toEqual({
        valid: false,
        error: {
          code: 'EQL_ERR_INVALID_EQL',
          messages: [
            'Found 2 problems\nline 1:1: Unknown column [event.category]\nline 1:13: Unknown column [event.name]',
            "line 1:4: mismatched input '<EOF>' expecting 'where'",
          ],
        },
      });
    });

    it('should return EQL_ERR_INVALID_EQL error in case of `mapping_exception` error', async () => {
      searchMock.search.mockImplementation(() =>
        of({ rawResponse: getEqlResponseWithMappingError() })
      );
      const response = await triggerValidateEql();

      expect(response).toEqual({
        valid: false,
        error: { code: 'EQL_ERR_INVALID_EQL', messages: ["Inaccessible index 'restricted-*'"] },
      });
    });

    it('should return EQL_ERR_INVALID_SYNTAX error in case of `parsing_exception` error', async () => {
      searchMock.search.mockImplementation(() =>
        of({ rawResponse: getEqlResponseWithParsingError() })
      );
      const response = await triggerValidateEql();

      expect(response).toEqual({
        valid: false,
        error: {
          code: 'EQL_ERR_INVALID_SYNTAX',
          messages: ["line 1:5: missing 'where' at 'demo'"],
        },
      });
    });

    it('should return EQL_ERR_FAILED_REQUEST error in case of non-validation error', async () => {
      searchMock.search.mockImplementation(() =>
        of({ rawResponse: getEqlResponseWithNonValidationError() })
      );
      const response = await triggerValidateEql();

      expect(response).toEqual({
        valid: false,
        error: {
          code: 'EQL_ERR_FAILED_REQUEST',
          error: expect.objectContaining(
            new Error(JSON.stringify(getEqlResponseWithNonValidationError()))
          ),
        },
      });
    });

    it('should return EQL_ERR_MISSING_DATA_SOURCE error in case `data.search` throws an error which starts with `index_not_found_exception`', async () => {
      const message = 'index_not_found_exception Found 1 problem line -1:-1: Unknown index [*,-*]';
      searchMock.search.mockImplementation(() => {
        throw new Error(message);
      });
      const response = await triggerValidateEql();

      expect(response).toEqual({
        valid: false,
        error: { code: 'EQL_ERR_MISSING_DATA_SOURCE', messages: [message] },
      });
    });

    it('should return EQL_ERR_FAILED_REQUEST error in case `data.search` throws an error', async () => {
      const message = 'Internal exception';
      searchMock.search.mockImplementation(() => {
        throw new Error(message);
      });
      const response = await triggerValidateEql();

      expect(response).toEqual({
        valid: false,
        error: {
          code: 'EQL_ERR_FAILED_REQUEST',
          error: expect.objectContaining(new Error(message)),
        },
      });
    });
  });
});
