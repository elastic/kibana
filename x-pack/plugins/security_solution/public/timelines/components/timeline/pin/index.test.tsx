/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { TimelineType } from '../../../../../common/types/timeline';

import { getPinIcon, Pin } from '.';

interface ButtonIcon {
  isDisabled: boolean;
}

describe('pin', () => {
  describe('getPinRotation', () => {
    test('it returns a filled pin when pinned is true', () => {
      expect(getPinIcon(true)).toEqual('pinFilled');
    });

    test('it returns an non-filled pin when pinned is false', () => {
      expect(getPinIcon(false)).toEqual('pin');
    });
  });

  describe('disabled button behavior', () => {
    test('the button is enabled when allowUnpinning is true, and timelineType is NOT `template` (the default)', () => {
      const allowUnpinning = true;
      const wrapper = mount(
        <Pin allowUnpinning={allowUnpinning} onClick={jest.fn()} pinned={false} />
      );

      expect(
        (wrapper.find('[data-test-subj="pin"]').first().props() as ButtonIcon).isDisabled
      ).toBe(false);
    });

    test('the button is disabled when allowUnpinning is false, and timelineType is NOT `template` (the default)', () => {
      const allowUnpinning = false;
      const wrapper = mount(
        <Pin allowUnpinning={allowUnpinning} onClick={jest.fn()} pinned={false} />
      );

      expect(
        (wrapper.find('[data-test-subj="pin"]').first().props() as ButtonIcon).isDisabled
      ).toBe(true);
    });

    test('the button is disabled when allowUnpinning is true, and timelineType is `template`', () => {
      const allowUnpinning = true;
      const timelineType = TimelineType.template;
      const wrapper = mount(
        <Pin
          allowUnpinning={allowUnpinning}
          onClick={jest.fn()}
          pinned={false}
          timelineType={timelineType}
        />
      );

      expect(
        (wrapper.find('[data-test-subj="pin"]').first().props() as ButtonIcon).isDisabled
      ).toBe(true);
    });

    test('the button is disabled when allowUnpinning is false, and timelineType is `template`', () => {
      const allowUnpinning = false;
      const timelineType = TimelineType.template;
      const wrapper = mount(
        <Pin
          allowUnpinning={allowUnpinning}
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
