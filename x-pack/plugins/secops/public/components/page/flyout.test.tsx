/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';
import {
  closeFlyout,
  Flyout,
  openFlyout,
  showFlyout,
  showFlyoutButton,
  showFlyoutElement,
} from './flyout';

describe('Flyout', () => {
  describe('rendering', () => {
    test('it renders the default flyout state as a button', () => {
      const wrapper = mount(<Flyout />);
      expect(
        wrapper
          .find('[data-test-subj="flyoutButton"]')
          .first()
          .text()
      ).toContain('T I M E L I N E');
    });

    test('it does NOT render the title element when the default flyout state is a button', () => {
      const wrapper = mount(<Flyout />);
      expect(wrapper.find('[data-test-subj="flyoutTitle"]').exists()).toEqual(false);
    });

    test('it renders the title element when its state is set to flyout is true', () => {
      const wrapper = mount(<Flyout />).setState({ isFlyoutVisible: true });
      expect(
        wrapper
          .find('[data-test-subj="flyoutTitle"]')
          .first()
          .text()
      ).toContain('Timeline');
    });

    test('it does NOT render the fly out button when its state is set to flyout is true', () => {
      const wrapper = mount(<Flyout />).setState({ isFlyoutVisible: true });
      expect(wrapper.find('[data-test-subj="flyoutButton"]').exists()).toEqual(false);
    });

    test('it renders children elements when its state is set to flyout is true', () => {
      const wrapper = mount(
        <Flyout>
          <p>I am a child of flyout</p>
        </Flyout>
      ).setState({ isFlyoutVisible: true });
      expect(
        wrapper
          .find('[data-test-subj="flyoutChildren"]')
          .first()
          .text()
      ).toContain('I am a child of flyout');
    });

    test('should call the onOpen when the mouse is entered for rendering', () => {
      const openMock = jest.fn();
      const wrapper = mount<Flyout>(<Flyout />);
      wrapper.instance().onOpen = openMock;
      wrapper.instance().forceUpdate();
      wrapper
        .find('[data-test-subj="flyoutOverlay"]')
        .first()
        .simulate('mouseenter');

      expect(openMock).toBeCalled();
    });

    test('should call the onClose when the close button is clicked', () => {
      const closeMock = jest.fn();
      const wrapper = mount<Flyout>(<Flyout />).setState({ isFlyoutVisible: true });
      wrapper.instance().onClose = closeMock;
      wrapper.instance().forceUpdate();
      wrapper
        .find('[data-test-subj="flyout"] button')
        .first()
        .simulate('click');

      expect(closeMock).toBeCalled();
    });
  });

  describe('showFlyout', () => {
    test('should set a state to true when true is passed as an argument', () => {
      const mockSetState = jest.fn();
      showFlyout(true, mockSetState);
      expect(mockSetState).toBeCalledWith({ isFlyoutVisible: true });
    });

    test('should set a state to false when false is passed as an argument', () => {
      const mockSetState = jest.fn();
      showFlyout(false, mockSetState);
      expect(mockSetState).toBeCalledWith({ isFlyoutVisible: false });
    });
  });

  describe('closeFlyout', () => {
    test('should set a state to false when false is passed as an argument', () => {
      const mockSetState = jest.fn();
      closeFlyout(mockSetState);
      expect(mockSetState).toBeCalledWith({ isFlyoutVisible: false });
    });
  });

  describe('openFlyout', () => {
    test('should set a state to true when true is passed as an argument', () => {
      const mockSetState = jest.fn();
      openFlyout(mockSetState);
      expect(mockSetState).toBeCalledWith({ isFlyoutVisible: true });
    });
  });

  describe('showFlyoutElement', () => {
    test('should return the flyout element with a title', () => {
      const closeMock = jest.fn();
      const flyoutElement = showFlyoutElement(closeMock, <p>I am a mock child</p>);
      const wrapper = mount(<span>{flyoutElement}</span>);
      expect(
        wrapper
          .find('[data-test-subj="flyoutTitle"]')
          .first()
          .text()
      ).toContain('Timeline');
    });

    test('should return the flyout element with children', () => {
      const closeMock = jest.fn();
      const flyoutElement = showFlyoutElement(closeMock, <p>I am a mock child</p>);
      const wrapper = mount(<span>{flyoutElement}</span>);
      expect(
        wrapper
          .find('[data-test-subj="flyoutChildren"]')
          .first()
          .text()
      ).toContain('I am a mock child');
    });

    test('should call the onClose when the close button is clicked', () => {
      const closeMock = jest.fn();
      const flyoutElement = showFlyoutElement(closeMock, <p>I am a mock child</p>);
      const wrapper = mount(<span>{flyoutElement}</span>);
      wrapper
        .find('[data-test-subj="flyout"] button')
        .first()
        .simulate('click');

      expect(closeMock).toBeCalled();
    });
  });

  describe('showFlyoutButton', () => {
    test('should return the flyout button with text', () => {
      const openMock = jest.fn();
      const flyoutButton = showFlyoutButton(openMock);
      const wrapper = mount(<span>{flyoutButton}</span>);
      expect(
        wrapper
          .find('[data-test-subj="flyoutButton"]')
          .first()
          .text()
      ).toContain('T I M E L I N E');
    });

    test('should call the onOpen when the mouse is entered', () => {
      const openMock = jest.fn();
      const flyoutButton = showFlyoutButton(openMock);
      const wrapper = mount(<span>{flyoutButton}</span>);
      wrapper
        .find('[data-test-subj="flyoutOverlay"]')
        .first()
        .simulate('mouseenter');

      expect(openMock).toBeCalled();
    });
  });
});
