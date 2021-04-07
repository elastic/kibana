/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DraggableProvidedDragHandleProps } from 'react-beautiful-dnd';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiButtonIcon, EuiPanel } from '@elastic/eui';

import { SchemaTypes } from '../../../shared/types';

import { Result } from './result';
import { ResultField } from './result_field';
import { ResultHeader } from './result_header';

describe('Result', () => {
  const props = {
    isMetaEngine: false,
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
        score: 100,
        engine: 'my-engine',
      },
    },
  };

  const schema = {
    title: 'text' as SchemaTypes,
    description: 'text' as SchemaTypes,
    length: 'number' as SchemaTypes,
  };

  it('renders', () => {
    const wrapper = shallow(<Result {...props} />);
    expect(wrapper.find(EuiPanel).exists()).toBe(true);
    expect(wrapper.find(EuiPanel).prop('title')).toEqual('Document 1');
  });

  it('should render a ResultField for each field except id and _meta', () => {
    const wrapper = shallow(<Result {...props} />);
    expect(wrapper.find(ResultField).map((rf) => rf.prop('field'))).toEqual([
      'title',
      'description',
      'length',
    ]);
  });

  it('renders a header', () => {
    const wrapper = shallow(<Result {...props} showScore isMetaEngine />);
    const header = wrapper.find(ResultHeader);
    expect(header.exists()).toBe(true);
    expect(header.prop('isMetaEngine')).toBe(true); // passed through from props
    expect(header.prop('showScore')).toBe(true); // passed through from props
    expect(header.prop('shouldLinkToDetailPage')).toBe(false); // passed through from props
    expect(header.prop('resultMeta')).toEqual({
      id: '1',
      score: 100,
      engine: 'my-engine',
    }); // passed through from meta in result prop
  });

  describe('actions', () => {
    const actions = [
      {
        title: 'Hide',
        onClick: jest.fn(),
        iconType: 'eyeClosed',
        iconColor: 'danger',
      },
      {
        title: 'Bookmark',
        onClick: jest.fn(),
        iconType: 'starFilled',
        iconColor: '',
      },
    ];

    it('will render an action button in the header for each action passed', () => {
      const wrapper = shallow(<Result {...props} actions={actions} />);
      const header = wrapper.find(ResultHeader);
      const renderedActions = shallow(header.prop('actions') as any);
      const buttons = renderedActions.find(EuiButtonIcon);
      expect(buttons).toHaveLength(2);

      expect(buttons.first().prop('iconType')).toEqual('eyeClosed');
      expect(buttons.first().prop('color')).toEqual('danger');
      buttons.first().simulate('click');
      expect(actions[0].onClick).toHaveBeenCalled();

      expect(buttons.last().prop('iconType')).toEqual('starFilled');
      // Note that no iconColor was passed so it was defaulted to primary
      expect(buttons.last().prop('color')).toEqual('primary');
      buttons.last().simulate('click');
      expect(actions[1].onClick).toHaveBeenCalled();
    });

    it('will render a document detail link as the first action if shouldLinkToDetailPage is passed', () => {
      const wrapper = shallow(<Result {...props} actions={actions} shouldLinkToDetailPage />);
      const header = wrapper.find(ResultHeader);
      const renderedActions = shallow(header.prop('actions') as any);
      const buttons = renderedActions.find(EuiButtonIcon);

      // In addition to the 2 actions passed, we also have a link action
      expect(buttons).toHaveLength(3);

      expect(buttons.first().prop('data-test-subj')).toEqual('DocumentDetailLink');
    });

    it('will not render anything if no actions are passed and shouldLinkToDetailPage is false', () => {
      const wrapper = shallow(<Result {...props} actions={undefined} />);
      const header = wrapper.find(ResultHeader);
      const renderedActions = shallow(header.prop('actions') as any);
      const buttons = renderedActions.find(EuiButtonIcon);
      expect(buttons).toHaveLength(0);
    });
  });

  describe('dragging', () => {
    // In the real world, the drag library sets data attributes, role, tabIndex, etc.
    const mockDragHandleProps = ({
      someMockProp: true,
    } as unknown) as DraggableProvidedDragHandleProps;

    it('will render a drag handle with the passed props', () => {
      const wrapper = shallow(<Result {...props} dragHandleProps={mockDragHandleProps} />);

      expect(wrapper.find('.appSearchResult__dragHandle')).toHaveLength(1);
      expect(wrapper.find('.appSearchResult__dragHandle').prop('someMockProp')).toEqual(true);
    });
  });

  it('will render field details with type highlights if schemaForTypeHighlights has been provided', () => {
    const wrapper = shallow(
      <Result {...props} shouldLinkToDetailPage schemaForTypeHighlights={schema} />
    );
    expect(wrapper.find(ResultField).map((rf) => rf.prop('type'))).toEqual([
      'text',
      'text',
      'number',
    ]);
  });

  describe('when there are more than 5 fields', () => {
    const propsWithMoreFields = {
      isMetaEngine: false,
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

      it('renders a hidden fields toggle button', () => {
        expect(wrapper.find('.appSearchResult__hiddenFieldsToggle').exists()).toBe(true);
      });

      it('renders a collapse icon', () => {
        expect(wrapper.find('[data-test-subj="CollapseResult"]').exists()).toBe(false);
      });

      it('does not render an expand icon', () => {
        expect(wrapper.find('[data-test-subj="ExpandResult"]').exists()).toBe(true);
      });

      it('shows no more than 5 fields', () => {
        expect(wrapper.find(ResultField).length).toEqual(5);
      });
    });

    describe('after clicking the expand button', () => {
      let wrapper: ShallowWrapper;

      beforeAll(() => {
        wrapper = shallow(<Result {...propsWithMoreFields} />);
        expect(wrapper.find('.appSearchResult__hiddenFieldsToggle').exists()).toBe(true);
        wrapper.find('.appSearchResult__hiddenFieldsToggle').simulate('click');
      });

      it('renders correct toggle text', () => {
        expect(wrapper.find('.appSearchResult__hiddenFieldsToggle').text()).toEqual(
          'Hide additional fields<EuiIcon />'
        );
      });

      it('renders a collapse icon', () => {
        expect(wrapper.find('[data-test-subj="CollapseResult"]').exists()).toBe(true);
      });

      it('does not render an expand icon', () => {
        expect(wrapper.find('[data-test-subj="ExpandResult"]').exists()).toBe(false);
      });

      it('shows all fields', () => {
        expect(wrapper.find(ResultField).length).toEqual(6);
      });
    });

    describe('after clicking the collapse button', () => {
      let wrapper: ShallowWrapper;

      beforeAll(() => {
        wrapper = shallow(<Result {...propsWithMoreFields} />);
        expect(wrapper.find('.appSearchResult__hiddenFieldsToggle').exists()).toBe(true);
        wrapper.find('.appSearchResult__hiddenFieldsToggle').simulate('click');
        wrapper.find('.appSearchResult__hiddenFieldsToggle').simulate('click');
      });

      it('renders correct toggle text', () => {
        expect(wrapper.find('.appSearchResult__hiddenFieldsToggle').text()).toEqual(
          'Show 1 additional field<EuiIcon />'
        );
      });

      it('renders a collapse icon', () => {
        expect(wrapper.find('[data-test-subj="CollapseResult"]').exists()).toBe(false);
      });

      it('does not render an expand icon', () => {
        expect(wrapper.find('[data-test-subj="ExpandResult"]').exists()).toBe(true);
      });

      it('shows no more than 5 fields', () => {
        expect(wrapper.find(ResultField).length).toEqual(5);
      });
    });
  });
});
