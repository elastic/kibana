/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiDragDropContext, EuiDraggable, EuiEmptyPrompt, EuiButtonEmpty } from '@elastic/eui';

import { DataPanel } from '../../../data_panel';
import { CurationResult } from '../results';

import { PromotedDocuments } from './';

describe('PromotedDocuments', () => {
  const values = {
    curation: {
      promoted: [
        { id: 'mock-document-1' },
        { id: 'mock-document-2' },
        { id: 'mock-document-3' },
        { id: 'mock-document-4' },
      ],
    },
    promotedIds: ['mock-document-1', 'mock-document-2', 'mock-document-3', 'mock-document-4'],
    promotedDocumentsLoading: false,
  };
  const actions = {
    setPromotedIds: jest.fn(),
    clearPromotedIds: jest.fn(),
    removePromotedId: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  const getDraggableChildren = (draggableWrapper: any) => {
    return draggableWrapper.renderProp('children')({}, {}, {});
  };

  it('renders a list of draggable promoted documents', () => {
    const wrapper = shallow(<PromotedDocuments />);

    expect(wrapper.find(EuiDraggable)).toHaveLength(4);

    wrapper.find(EuiDraggable).forEach((draggableWrapper) => {
      expect(getDraggableChildren(draggableWrapper).find(CurationResult).exists()).toBe(true);
    });
  });

  it('renders an empty state & hides the panel actions when empty', () => {
    setMockValues({ ...values, curation: { promoted: [] } });
    const wrapper = shallow(<PromotedDocuments />);

    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
    expect(wrapper.find(DataPanel).prop('action')).toBe(false);
  });

  it('renders a loading state', () => {
    setMockValues({ ...values, promotedDocumentsLoading: true });
    const wrapper = shallow(<PromotedDocuments />);

    expect(wrapper.find(DataPanel).prop('isLoading')).toEqual(true);
  });

  describe('actions', () => {
    it('renders results with an action button that demotes the result', () => {
      const wrapper = shallow(<PromotedDocuments />);
      const result = getDraggableChildren(wrapper.find(EuiDraggable).last());
      result.prop('actions')[0].onClick();

      expect(actions.removePromotedId).toHaveBeenCalledWith('mock-document-4');
    });

    it('renders a demote all button that demotes all hidden results', () => {
      const wrapper = shallow(<PromotedDocuments />);
      const panelActions = shallow(wrapper.find(DataPanel).prop('action') as React.ReactElement);

      panelActions.find(EuiButtonEmpty).simulate('click');
      expect(actions.clearPromotedIds).toHaveBeenCalled();
    });

    describe('draggging', () => {
      it('calls setPromotedIds with the reordered list when users are done dragging', () => {
        const wrapper = shallow(<PromotedDocuments />);
        wrapper.find(EuiDragDropContext).simulate('dragEnd', {
          source: { index: 3 },
          destination: { index: 0 },
        });

        expect(actions.setPromotedIds).toHaveBeenCalledWith([
          'mock-document-4',
          'mock-document-1',
          'mock-document-2',
          'mock-document-3',
        ]);
      });

      it('does not error if source/destination are unavailable on drag end', () => {
        const wrapper = shallow(<PromotedDocuments />);
        wrapper.find(EuiDragDropContext).simulate('dragEnd', {});

        expect(actions.setPromotedIds).not.toHaveBeenCalled();
      });
    });
  });
});
