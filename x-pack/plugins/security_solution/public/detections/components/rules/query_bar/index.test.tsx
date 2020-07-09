/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { QueryBarDefineRule } from './index';
import { useFormFieldMock } from '../../../../common/mock';

jest.mock('../../../../common/lib/kibana');

describe('QueryBarDefineRule', () => {
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
});
