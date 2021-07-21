/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockFlashMessageHelpers,
  mockHttpValues,
  mockKibanaValues,
} from '../../../../../__mocks__/kea_logic';
import '../../../../__mocks__/engine_logic.mock';

jest.mock('../../crawler_overview_logic', () => ({
  CrawlerOverviewLogic: {
    actions: {
      onReceiveCrawlerData: jest.fn(),
    },
  },
}));

import { nextTick } from '@kbn/test/jest';

import { defaultErrorMessage } from '../../../../../shared/flash_messages/handle_api_errors';
import { CrawlerOverviewLogic } from '../../crawler_overview_logic';
import { CrawlerDomain } from '../../types';

import { AddDomainLogic, AddDomainLogicValues } from './add_domain_logic';

const DEFAULT_VALUES: AddDomainLogicValues = {
  addDomainFormInputValue: 'https://',
  allowSubmit: false,
  entryPointValue: '/',
  hasValidationCompleted: false,
  errors: [],
};

describe('AddDomainLogic', () => {
  const { mount } = new LogicMounter(AddDomainLogic);
  const { flashSuccessToast } = mockFlashMessageHelpers;
  const { http } = mockHttpValues;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has default values', () => {
    mount();
    expect(AddDomainLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('clearDomainFormInputValue', () => {
      beforeAll(() => {
        mount({
          addDomainFormInputValue: 'http://elastic.co',
          entryPointValue: '/foo',
          hasValidationCompleted: true,
          errors: ['first error', 'second error'],
        });

        AddDomainLogic.actions.clearDomainFormInputValue();
      });

      it('should clear the input value', () => {
        expect(AddDomainLogic.values.addDomainFormInputValue).toEqual('https://');
      });

      it('should clear the entry point value', () => {
        expect(AddDomainLogic.values.entryPointValue).toEqual('/');
      });

      it('should reset validation completion', () => {
        expect(AddDomainLogic.values.hasValidationCompleted).toEqual(false);
      });

      it('should clear errors', () => {
        expect(AddDomainLogic.values.errors).toEqual([]);
      });
    });

    describe('onSubmitNewDomainError', () => {
      it('should set errors', () => {
        mount();

        AddDomainLogic.actions.onSubmitNewDomainError(['first error', 'second error']);

        expect(AddDomainLogic.values.errors).toEqual(['first error', 'second error']);
      });
    });

    describe('onValidateDomain', () => {
      beforeAll(() => {
        mount({
          addDomainFormInputValue: 'https://elastic.co',
          entryPointValue: '/customers',
          hasValidationCompleted: true,
          errors: ['first error', 'second error'],
        });

        AddDomainLogic.actions.onValidateDomain('https://swiftype.com', '/site-search');
      });

      it('should set the input value', () => {
        expect(AddDomainLogic.values.addDomainFormInputValue).toEqual('https://swiftype.com');
      });

      it('should set the entry point value', () => {
        expect(AddDomainLogic.values.entryPointValue).toEqual('/site-search');
      });

      it('should flag validation as being completed', () => {
        expect(AddDomainLogic.values.hasValidationCompleted).toEqual(true);
      });

      it('should clear errors', () => {
        expect(AddDomainLogic.values.errors).toEqual([]);
      });
    });

    describe('setAddDomainFormInputValue', () => {
      beforeAll(() => {
        mount({
          addDomainFormInputValue: 'https://elastic.co',
          entryPointValue: '/customers',
          hasValidationCompleted: true,
          errors: ['first error', 'second error'],
        });

        AddDomainLogic.actions.setAddDomainFormInputValue('https://swiftype.com/site-search');
      });

      it('should set the input value', () => {
        expect(AddDomainLogic.values.addDomainFormInputValue).toEqual(
          'https://swiftype.com/site-search'
        );
      });

      it('should clear the entry point value', () => {
        expect(AddDomainLogic.values.entryPointValue).toEqual('/');
      });

      it('should reset validation completion', () => {
        expect(AddDomainLogic.values.hasValidationCompleted).toEqual(false);
      });

      it('should clear errors', () => {
        expect(AddDomainLogic.values.errors).toEqual([]);
      });
    });

    describe('submitNewDomain', () => {
      it('should clear errors', () => {
        expect(AddDomainLogic.values.errors).toEqual([]);
      });
    });
  });

  describe('listeners', () => {
    describe('onSubmitNewDomainSuccess', () => {
      it('should flash a success toast', () => {
        const { navigateToUrl } = mockKibanaValues;
        mount();

        AddDomainLogic.actions.onSubmitNewDomainSuccess({ id: 'test-domain' } as CrawlerDomain);

        expect(flashSuccessToast).toHaveBeenCalled();
        expect(navigateToUrl).toHaveBeenCalledWith(
          '/engines/some-engine/crawler/domains/test-domain'
        );
      });
    });

    describe('submitNewDomain', () => {
      it('calls the domains endpoint with a JSON formatted body', async () => {
        mount({
          addDomainFormInputValue: 'https://elastic.co',
          entryPointValue: '/guide',
        });
        http.post.mockReturnValueOnce(Promise.resolve({}));

        AddDomainLogic.actions.submitNewDomain();
        await nextTick();

        expect(http.post).toHaveBeenCalledWith(
          '/api/app_search/engines/some-engine/crawler/domains',
          {
            query: {
              respond_with: 'crawler_details',
            },
            body: JSON.stringify({
              name: 'https://elastic.co',
              entry_points: [{ value: '/guide' }],
            }),
          }
        );
      });

      describe('on success', () => {
        beforeEach(() => {
          mount();
        });

        it('sets crawler data', async () => {
          http.post.mockReturnValueOnce(
            Promise.resolve({
              domains: [],
            })
          );

          AddDomainLogic.actions.submitNewDomain();
          await nextTick();

          expect(CrawlerOverviewLogic.actions.onReceiveCrawlerData).toHaveBeenCalledWith({
            domains: [],
          });
        });

        it('calls the success callback with the most recent domain', async () => {
          http.post.mockReturnValueOnce(
            Promise.resolve({
              domains: [
                {
                  id: '1',
                  name: 'https://elastic.co/guide',
                },
                {
                  id: '2',
                  name: 'https://swiftype.co/site-search',
                },
              ],
            })
          );
          jest.spyOn(AddDomainLogic.actions, 'onSubmitNewDomainSuccess');
          AddDomainLogic.actions.submitNewDomain();
          await nextTick();

          expect(AddDomainLogic.actions.onSubmitNewDomainSuccess).toHaveBeenCalledWith({
            id: '2',
            url: 'https://swiftype.co/site-search',
          });
        });
      });

      describe('on error', () => {
        beforeEach(() => {
          mount();
          jest.spyOn(AddDomainLogic.actions, 'onSubmitNewDomainError');
        });

        it('passes error messages to the error callback', async () => {
          http.post.mockReturnValueOnce(
            Promise.reject({
              body: {
                attributes: {
                  errors: ['first error', 'second error'],
                },
              },
            })
          );

          AddDomainLogic.actions.submitNewDomain();
          await nextTick();

          expect(AddDomainLogic.actions.onSubmitNewDomainError).toHaveBeenCalledWith([
            'first error',
            'second error',
          ]);
        });
      });
    });

    describe('validateDomain', () => {
      it('extracts the domain and entrypoint and passes them to the callback ', () => {
        mount({ addDomainFormInputValue: 'https://swiftype.com/site-search' });
        jest.spyOn(AddDomainLogic.actions, 'onValidateDomain');

        AddDomainLogic.actions.validateDomain();

        expect(AddDomainLogic.actions.onValidateDomain).toHaveBeenCalledWith(
          'https://swiftype.com',
          '/site-search'
        );
      });
    });
  });

  describe('selectors', () => {
    describe('allowSubmit', () => {
      it('gets set true when validation is completed', () => {
        mount({ hasValidationCompleted: false });
        expect(AddDomainLogic.values.allowSubmit).toEqual(false);

        mount({ hasValidationCompleted: true });
        expect(AddDomainLogic.values.allowSubmit).toEqual(true);
      });
    });
  });
});
