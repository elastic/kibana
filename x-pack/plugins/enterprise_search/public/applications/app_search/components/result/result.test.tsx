/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';
import { EuiPanel } from '@elastic/eui';

import { Result } from './result';
import { ResultField } from './result_field';

describe('Result', () => {
  const props = {
    result: {
      id: {
        raw: '1',
      },
      title: {
        raw: 'A title',
      },
      description: {
        raw: 'A description',
      },
      length: {
        raw: 100,
      },
      _meta: {},
    },
  };

  it('renders', () => {
    const wrapper = shallow(<Result {...props} />);
    expect(wrapper.find(EuiPanel).exists()).toBe(true);
  });

  it('should render a ResultField for each field except id and _meta', () => {
    const wrapper = shallow(<Result {...props} />);
    expect(wrapper.find(ResultField).map((rf) => rf.prop('field'))).toEqual([
      'title',
      'description',
      'length',
    ]);
  });

  describe('when there are more than 5 fields', () => {
    const propsWithMoreFields = {
      result: {
        id: {
          raw: '1',
        },
        title: {
          raw: 'A title',
        },
        description: {
          raw: 'A description',
        },
        length: {
          raw: 100,
        },
        states: {
          raw: ['Pennsylvania', 'Ohio'],
        },
        visitors: {
          raw: 1000,
        },
        size: {
          raw: 200,
        },
        _meta: {},
      },
    };

    describe('the initial render', () => {
      let wrapper: ShallowWrapper;

      beforeAll(() => {
        wrapper = shallow(<Result {...propsWithMoreFields} />);
      });

      it('renders a collapse button', () => {
        expect(wrapper.find('[data-test-subj="CollapseResult"]').exists()).toBe(false);
      });

      it('does not render an expand button', () => {
        expect(wrapper.find('[data-test-subj="ExpandResult"]').exists()).toBe(true);
      });

      it('renders a hidden fields indicator', () => {
        expect(wrapper.find('.appSearchResult__hiddenFieldsIndicator').text()).toEqual(
          '1 more fields'
        );
      });

      it('shows no more than 5 fields', () => {
        expect(wrapper.find(ResultField).length).toEqual(5);
      });
    });

    describe('after clicking the expand button', () => {
      let wrapper: ShallowWrapper;

      beforeAll(() => {
        wrapper = shallow(<Result {...propsWithMoreFields} />);
        expect(wrapper.find('.appSearchResult__toggleExpandButton').exists()).toBe(true);
        wrapper.find('.appSearchResult__toggleExpandButton').simulate('click');
      });

      it('renders a collapse button', () => {
        expect(wrapper.find('[data-test-subj="CollapseResult"]').exists()).toBe(true);
      });

      it('does not render an expand button', () => {
        expect(wrapper.find('[data-test-subj="ExpandResult"]').exists()).toBe(false);
      });

      it('does not render a hidden fields indicator', () => {
        expect(wrapper.find('.appSearchResult__hiddenFieldsIndicator').exists()).toBe(false);
      });

      it('shows all fields', () => {
        expect(wrapper.find(ResultField).length).toEqual(6);
      });
    });

    describe('after clicking the collapse button', () => {
      let wrapper: ShallowWrapper;

      beforeAll(() => {
        wrapper = shallow(<Result {...propsWithMoreFields} />);
        expect(wrapper.find('.appSearchResult__toggleExpandButton').exists()).toBe(true);
        wrapper.find('.appSearchResult__toggleExpandButton').simulate('click');
        wrapper.find('.appSearchResult__toggleExpandButton').simulate('click');
      });

      it('renders a collapse button', () => {
        expect(wrapper.find('[data-test-subj="CollapseResult"]').exists()).toBe(false);
      });

      it('does not render an expand button', () => {
        expect(wrapper.find('[data-test-subj="ExpandResult"]').exists()).toBe(true);
      });

      it('renders a hidden fields indicator', () => {
        expect(wrapper.find('.appSearchResult__hiddenFieldsIndicator').text()).toEqual(
          '1 more fields'
        );
      });

      it('shows no more than 5 fields', () => {
        expect(wrapper.find(ResultField).length).toEqual(5);
      });
    });
  });
});
