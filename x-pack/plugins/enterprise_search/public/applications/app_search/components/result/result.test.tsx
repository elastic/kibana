/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';
import { EuiPanel } from '@elastic/eui';

import { ResultField } from './result_field';
import { ResultHeader } from './result_header';
import { Result } from './result';

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
      _meta: {
        id: '1',
        scopedId: '1',
        score: 100,
        engine: 'my-engine',
      },
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

  it('passes through showScore and resultMeta to ResultHeader', () => {
    const wrapper = shallow(<Result {...props} showScore={true} />);
    expect(wrapper.find(ResultHeader).prop('showScore')).toBe(true);
    expect(wrapper.find(ResultHeader).prop('resultMeta')).toEqual({
      id: '1',
      scopedId: '1',
      score: 100,
      engine: 'my-engine',
    });
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
        _meta: {
          id: '1',
          scopedId: '1',
          score: 100,
          engine: 'my-engine',
        },
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
        expect(wrapper.find('.appSearchResult__actionButton').exists()).toBe(true);
        wrapper.find('.appSearchResult__actionButton').simulate('click');
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
        expect(wrapper.find('.appSearchResult__actionButton').exists()).toBe(true);
        wrapper.find('.appSearchResult__actionButton').simulate('click');
        wrapper.find('.appSearchResult__actionButton').simulate('click');
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
