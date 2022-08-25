/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

import { ExceptionsViewer } from '.';
import { useKibana } from '../../../../common/lib/kibana';
import { TestProviders } from '../../../../common/mock';
import type { Rule } from '../../../../detections/containers/detection_engine/rules/types';
import { mockRule } from '../../../../detections/pages/detection_engine/rules/all/__mocks__/mock';
import { useFindExceptionListReferences } from '../../logic/use_find_references';

jest.mock('../../../../common/lib/kibana');
jest.mock('@kbn/securitysolution-list-hooks');
jest.mock('../../logic/use_find_references');

const getMockRule = (): Rule => ({
  ...mockRule('123'),
  exceptions_list: [
    {
      id: '5b543420',
      list_id: 'list_id',
      type: 'endpoint',
      namespace_type: 'single',
    },
  ],
});

describe('ExceptionsViewer', () => {
  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        http: {},
        application: {
          getUrlForApp: () => 'some/url',
        },
      },
    });

    (useFindExceptionListReferences as jest.Mock).mockReturnValue([false, null]);
  });

  it('it renders loader if "loadingList" is true', () => {
    const wrapper = mount(
      <TestProviders>
        <ExceptionsViewer
          rule={{
            ...getMockRule(),
            exceptions_list: [
              {
                id: '5b543420',
                list_id: 'list_id',
                type: 'detection',
                namespace_type: 'single',
              },
            ],
          }}
          listType={ExceptionListTypeEnum.DETECTION}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="loadingPanelAllRulesTable"]').exists()).toBeTruthy();
  });

  it('it renders empty prompt if no "exceptionListMeta" passed in', () => {
    const wrapper = mount(
      <TestProviders>
        <ExceptionsViewer
          rule={{
            ...getMockRule(),
            exceptions_list: [
              {
                id: '5b543420',
                list_id: 'list_id',
                type: 'detection',
                namespace_type: 'single',
              },
            ],
          }}
          listType={ExceptionListTypeEnum.DETECTION}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="exceptionsEmptyPrompt"]').exists()).toBeTruthy();
  });

  it('it renders empty prompt if no exception items exist', () => {
    const wrapper = mount(
      <TestProviders>
        <ExceptionsViewer
          rule={{
            ...getMockRule(),
            exceptions_list: [
              {
                id: '5b543420',
                list_id: 'list_id',
                type: 'detection',
                namespace_type: 'single',
              },
            ],
          }}
          listType={ExceptionListTypeEnum.DETECTION}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="exceptionsEmptyPrompt"]').exists()).toBeTruthy();
  });
});
