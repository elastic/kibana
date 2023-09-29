/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { TestProviders } from '../../../../common/mock';
import { EqlQueryBarFooter } from './footer';

jest.mock('../../../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...originalModule,
    useKibana: () => ({
      services: {
        docLinks: { links: { query: { eql: 'url-eql_doc' } } },
      },
    }),
  };
});

describe('EQL footer', () => {
  describe('EQL Settings', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('EQL settings button is enable when popover is NOT open', () => {
      const wrapper = mount(
        <TestProviders>
          <EqlQueryBarFooter errors={[]} onOptionsChange={jest.fn()} />
        </TestProviders>
      );

      expect(
        wrapper.find(`[data-test-subj="eql-settings-trigger"]`).first().prop('isDisabled')
      ).toBeFalsy();
    });

    it('disable EQL settings button when popover is open', () => {
      const wrapper = mount(
        <TestProviders>
          <EqlQueryBarFooter errors={[]} onOptionsChange={jest.fn()} />
        </TestProviders>
      );
      wrapper.find(`[data-test-subj="eql-settings-trigger"]`).first().simulate('click');
      wrapper.update();

      expect(
        wrapper.find(`[data-test-subj="eql-settings-trigger"]`).first().prop('isDisabled')
      ).toBeTruthy();
    });
  });
});
