/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { TimelineType } from '../../../../../common/types/timeline';

import { getDefaultAriaLabel, getPinIcon, Pin } from '.';

interface ButtonIcon {
  isDisabled: boolean;
}

describe('pin', () => {
  describe('getDefaultAriaLabel', () => {
    test('it returns the expected label for a timeline template event', () => {
      const isAlert = false;
      const isTemplate = true;
      const isPinned = false;

      expect(getDefaultAriaLabel({ isAlert, isTemplate, isPinned })).toEqual(
        'This event may not be pinned while editing a template timeline'
      );
    });

    test('it returns the expected label for a timeline template alert', () => {
      const isAlert = true;
      const isTemplate = true;
      const isPinned = false;

      expect(getDefaultAriaLabel({ isAlert, isTemplate, isPinned })).toEqual(
        'This alert may not be pinned while editing a template timeline'
      );
    });

    test('it returns the expected label for a pinned event', () => {
      const isAlert = false;
      const isTemplate = false;
      const isPinned = true;

      expect(getDefaultAriaLabel({ isAlert, isTemplate, isPinned })).toEqual('Unpin event');
    });

    test('it returns the expected label for a pinned alert', () => {
      const isAlert = true;
      const isTemplate = false;
      const isPinned = true;

      expect(getDefaultAriaLabel({ isAlert, isTemplate, isPinned })).toEqual('Unpin alert');
    });

    test('it returns the expected label for a unpinned event', () => {
      const isAlert = false;
      const isTemplate = false;
      const isPinned = false;

      expect(getDefaultAriaLabel({ isAlert, isTemplate, isPinned })).toEqual('Pin event');
    });

    test('it returns the expected label for a unpinned alert', () => {
      const isAlert = true;
      const isTemplate = false;
      const isPinned = false;

      expect(getDefaultAriaLabel({ isAlert, isTemplate, isPinned })).toEqual('Pin alert');
    });
  });

  describe('getPinRotation', () => {
    test('it returns a filled pin when pinned is true', () => {
      expect(getPinIcon(true)).toEqual('pinFilled');
    });

    test('it returns an non-filled pin when pinned is false', () => {
      expect(getPinIcon(false)).toEqual('pin');
    });
  });

  describe('disabled button behavior', () => {
    test('the button is enabled for an event when allowUnpinning is true, and timelineType is NOT `template` (the default)', () => {
      const isAlert = false;
      const allowUnpinning = true;
      const wrapper = mount(
        <Pin allowUnpinning={allowUnpinning} isAlert={isAlert} onClick={jest.fn()} pinned={false} />
      );

      expect(
        (wrapper.find('[data-test-subj="pin"]').first().props() as ButtonIcon).isDisabled
      ).toBe(false);
    });

    test('the button is enabled for an alert when allowUnpinning is true, and timelineType is NOT `template` (the default)', () => {
      const isAlert = true;
      const allowUnpinning = true;
      const wrapper = mount(
        <Pin allowUnpinning={allowUnpinning} isAlert={isAlert} onClick={jest.fn()} pinned={false} />
      );

      expect(
        (wrapper.find('[data-test-subj="pin"]').first().props() as ButtonIcon).isDisabled
      ).toBe(false);
    });

    test('the button is disabled for an event when allowUnpinning is false, and timelineType is NOT `template` (the default)', () => {
      const isAlert = false;
      const allowUnpinning = false;
      const wrapper = mount(
        <Pin allowUnpinning={allowUnpinning} isAlert={isAlert} onClick={jest.fn()} pinned={false} />
      );

      expect(
        (wrapper.find('[data-test-subj="pin"]').first().props() as ButtonIcon).isDisabled
      ).toBe(true);
    });

    test('the button is disabled for an alert when allowUnpinning is false, and timelineType is NOT `template` (the default)', () => {
      const isAlert = true;
      const allowUnpinning = false;
      const wrapper = mount(
        <Pin allowUnpinning={allowUnpinning} isAlert={isAlert} onClick={jest.fn()} pinned={false} />
      );

      expect(
        (wrapper.find('[data-test-subj="pin"]').first().props() as ButtonIcon).isDisabled
      ).toBe(true);
    });

    test('the button is disabled for an event when allowUnpinning is true, and timelineType is `template`', () => {
      const isAlert = false;
      const allowUnpinning = true;
      const timelineType = TimelineType.template;
      const wrapper = mount(
        <Pin
          allowUnpinning={allowUnpinning}
          isAlert={isAlert}
          onClick={jest.fn()}
          pinned={false}
          timelineType={timelineType}
        />
      );

      expect(
        (wrapper.find('[data-test-subj="pin"]').first().props() as ButtonIcon).isDisabled
      ).toBe(true);
    });

    test('the button is disabled for an alert when allowUnpinning is true, and timelineType is `template`', () => {
      const isAlert = true;
      const allowUnpinning = true;
      const timelineType = TimelineType.template;
      const wrapper = mount(
        <Pin
          allowUnpinning={allowUnpinning}
          isAlert={isAlert}
          onClick={jest.fn()}
          pinned={false}
          timelineType={timelineType}
        />
      );

      expect(
        (wrapper.find('[data-test-subj="pin"]').first().props() as ButtonIcon).isDisabled
      ).toBe(true);
    });

    test('the button is disabled for an event when allowUnpinning is false, and timelineType is `template`', () => {
      const isAlert = false;
      const allowUnpinning = false;
      const timelineType = TimelineType.template;
      const wrapper = mount(
        <Pin
          allowUnpinning={allowUnpinning}
          isAlert={isAlert}
          onClick={jest.fn()}
          pinned={false}
          timelineType={timelineType}
        />
      );

      expect(
        (wrapper.find('[data-test-subj="pin"]').first().props() as ButtonIcon).isDisabled
      ).toBe(true);
    });

    test('the button is disabled for an alert when allowUnpinning is false, and timelineType is `template`', () => {
      const isAlert = true;
      const allowUnpinning = false;
      const timelineType = TimelineType.template;
      const wrapper = mount(
        <Pin
          allowUnpinning={allowUnpinning}
          isAlert={isAlert}
          onClick={jest.fn()}
          pinned={false}
          timelineType={timelineType}
        />
      );

      expect(
        (wrapper.find('[data-test-subj="pin"]').first().props() as ButtonIcon).isDisabled
      ).toBe(true);
    });
  });
});
