/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, shallow } from 'enzyme';

import { QueryBarDefineRule } from './index';
import {
  TestProviders,
  useFormFieldMock,
  mockOpenTimelineQueryResults,
} from '../../../../common/mock';
import { mockHistory, Router } from '../../../../cases/components/__mock__/router';
import { useGetAllTimeline, getAllTimeline } from '../../../../timelines/containers/all';

jest.mock('../../../../common/lib/kibana');

jest.mock('../../../../timelines/containers/all', () => {
  const originalModule = jest.requireActual('../../../../timelines/containers/all');
  return {
    ...originalModule,
    useGetAllTimeline: jest.fn(),
  };
});

describe('QueryBarDefineRule', () => {
  beforeEach(() => {
    ((useGetAllTimeline as unknown) as jest.Mock).mockReturnValue({
      fetchAllTimeline: jest.fn(),
      timelines: getAllTimeline('', mockOpenTimelineQueryResults.timeline ?? []),
      loading: false,
      totalCount: mockOpenTimelineQueryResults.totalCount,
      refetch: jest.fn(),
    });
  });

  it('renders correctly', () => {
    const Component = () => {
      const field = useFormFieldMock();

      return (
        <QueryBarDefineRule
          browserFields={{}}
          isLoading={false}
          indexPattern={{ fields: [], title: 'title' }}
          onCloseTimelineSearch={jest.fn()}
          openTimelineSearch={true}
          dataTestSubj="query-bar-define-rule"
          idAria="idAria"
          field={field}
        />
      );
    };
    const wrapper = shallow(<Component />);
    expect(wrapper.dive().find('[data-test-subj="query-bar-define-rule"]')).toHaveLength(1);
  });

  it('renders import query from saved timeline modal actions hidden correctly', () => {
    const Component = () => {
      const field = useFormFieldMock();

      return (
        <QueryBarDefineRule
          browserFields={{}}
          isLoading={false}
          indexPattern={{ fields: [], title: 'title' }}
          onCloseTimelineSearch={jest.fn()}
          openTimelineSearch={true}
          dataTestSubj="query-bar-define-rule"
          idAria="idAria"
          field={field}
        />
      );
    };
    const wrapper = mount(
      <TestProviders>
        <Router history={mockHistory}>
          <Component />
        </Router>
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="open-duplicate"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="create-from-template"]').exists()).toBeFalsy();
  });
});
