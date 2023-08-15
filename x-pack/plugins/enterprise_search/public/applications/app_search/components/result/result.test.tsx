/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockKibanaValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import type { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiBadge, EuiPanel } from '@elastic/eui';

import { SchemaType } from '../../../shared/schema/types';
import { mountWithIntl } from '../../../test_helpers';

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
    title: SchemaType.Text,
    description: SchemaType.Text,
    length: SchemaType.Number,
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

  describe('header', () => {
    it('renders a header', () => {
      const wrapper = shallow(<Result {...props} showScore isMetaEngine />);
      const header = wrapper.find(ResultHeader);

      expect(header.exists()).toBe(true);
      expect(header.prop('isMetaEngine')).toBe(true); // passed through from props
      expect(header.prop('showScore')).toBe(true); // passed through from props
      expect(header.prop('resultMeta')).toEqual({
        id: '1',
        score: 100,
        engine: 'my-engine',
      }); // passed through from meta in result prop
      expect(header.prop('documentLink')).toBe(undefined); // based on shouldLinkToDetailPage prop
    });

    it('passes documentLink when shouldLinkToDetailPage is true', () => {
      const wrapper = shallow(<Result {...props} shouldLinkToDetailPage />);
      const header = wrapper.find(ResultHeader);

      expect(header.prop('documentLink')).toBe('/engines/my-engine/documents/1');
    });

    it('contains the result position if one is passed', () => {
      const wrapper = mountWithIntl(<Result {...props} resultPosition={4} />);
      const header = wrapper.find(ResultHeader);
      expect(header.find(EuiBadge).text()).toContain('#4');
    });
  });

  describe('actions', () => {
    const actions = [
      {
        title: 'Hide',
        onClick: jest.fn(),
        iconType: 'eyeClosed',
      },
      {
        title: 'Bookmark',
        onClick: jest.fn(),
        iconType: 'starFilled',
      },
    ];

    it('passes actions to the header', () => {
      const wrapper = shallow(<Result {...props} actions={actions} />);
      expect(wrapper.find(ResultHeader).prop('actions')).toEqual(actions);
    });

    it('adds a link action to the start of the actions array if shouldLinkToDetailPage is passed', () => {
      const wrapper = shallow(<Result {...props} actions={actions} shouldLinkToDetailPage />);

      const passedActions = wrapper.find(ResultHeader).prop('actions');
      expect(passedActions.length).toEqual(3); // In addition to the 2 actions passed, we also have a link action

      const linkAction = passedActions[0];
      expect(linkAction.title).toEqual('Visit document details');

      linkAction.onClick();
      expect(mockKibanaValues.navigateToUrl).toHaveBeenCalledWith('/engines/my-engine/documents/1');
    });
  });

  describe('dragging', () => {
    // In the real world, the drag library sets data attributes, role, tabIndex, etc.
    const mockDragHandleProps = {
      someMockProp: true,
    } as unknown as DraggableProvidedDragHandleProps;

    it('will render a drag handle with the passed props', () => {
      const wrapper = shallow(<Result {...props} dragHandleProps={mockDragHandleProps} />);

      expect(wrapper.find('.appSearchResult__dragHandle')).toHaveLength(1);
      expect(wrapper.find('.appSearchResult__dragHandle').prop('someMockProp')).toEqual(true);
    });
  });

  it('will render field details with type highlights if schemaForTypeHighlights has been provided', () => {
    const wrapper = shallow(<Result {...props} schemaForTypeHighlights={schema} />);
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
