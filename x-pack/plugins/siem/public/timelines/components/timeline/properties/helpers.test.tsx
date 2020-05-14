/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow, ShallowWrapper, mount } from 'enzyme';
import React from 'react';
import { NewTimeline, NewTimelineProps } from './helpers';
import { TimelineType } from '../../../../../common/types/timeline';

describe('NewTimeline', () => {
  let wrapper: ShallowWrapper;
  let onClickWrapper;

  const props: NewTimelineProps = {
    createTimeline: jest.fn(),
    onClosePopover: jest.fn(),
    outline: false,
    showTimeline: jest.fn(),
    timelineId: 'mockTimelineId',
    timelineType: TimelineType.default,
    title: 'mockTitle',
  };

  describe('render', () => {
    describe('default', () => {
      beforeAll(() => {
        wrapper = shallow(<NewTimeline {...props} />);
      });

      test('it should render EuiButtonEmpty by default', () => {
        expect(wrapper.find('EuiButtonEmpty').exists()).toBeTruthy();
      });

      test('it should not render EuiButton', () => {
        expect(wrapper.find('EuiButton').exists()).not.toBeTruthy();
      });

      test('it should render plusInCircle icon', () => {
        expect(wrapper.prop('iconType')).toEqual('plusInCircle');
      });

      test('it should render text as color', () => {
        expect(wrapper.prop('color')).toEqual('text');
      });
    });

    describe('show outline', () => {
      beforeAll(() => {
        const enableOutline = {
          ...props,
          outline: true,
        };
        wrapper = shallow(<NewTimeline {...enableOutline} />);
      });

      test('it should not render EuiButtonEmpty by default', () => {
        expect(wrapper.find('EuiButtonEmpty').exists()).not.toBeTruthy();
      });

      test('it should render EuiButton', () => {
        expect(wrapper.find('EuiButton').exists()).toBeTruthy();
      });

      test('it should render plusInCircle icon', () => {
        expect(wrapper.prop('iconType')).toEqual('plusInCircle');
      });

      test('it should render with filled background', () => {
        expect(wrapper.prop('fill')).toBeTruthy();
      });
    });
  });

  describe('onClick', () => {
    beforeAll(() => {
      jest.clearAllMocks();
      onClickWrapper = mount(<NewTimeline {...props} />);
      onClickWrapper.find('EuiButtonEmpty').simulate('click');
    });

    afterAll(() => {
      jest.clearAllMocks();
    });

    test('should call createTimeline', () => {
      expect(props.createTimeline).toHaveBeenCalledWith({
        id: props.timelineId,
        show: true,
        timelineType: props.timelineType,
      });
    });

    test('should call onClosePopover', () => {
      expect(props.onClosePopover).toHaveBeenCalled();
    });

    test('should call showTimeline', () => {
      expect(props.showTimeline).toHaveBeenCalledWith({
        id: props.timelineId,
        show: true,
      });
    });
  });
});
