/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { AlertsFlyout } from './alerts_flyout';
import { AlertsField } from '../../../../types';

const onClose = jest.fn();
const onPaginateNext = jest.fn();
const onPaginatePrevious = jest.fn();
const props = {
  alert: {
    [AlertsField.name]: ['one'],
    [AlertsField.reason]: ['two'],
  },
  onClose,
  onPaginateNext,
  onPaginatePrevious,
};

describe('AlertsFlyout', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render high level details from the alert', async () => {
    const wrapper = mountWithIntl(<AlertsFlyout {...props} />);
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    expect(wrapper.find('[data-test-subj="alertsFlyoutTitle"]').first().text()).toBe('one');
    expect(wrapper.find('[data-test-subj="alertsFlyoutReason"]').first().text()).toBe('two');
  });

  it('should allow pagination', async () => {
    const wrapper = mountWithIntl(<AlertsFlyout {...props} />);
    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    wrapper.find('[data-test-subj="alertsFlyoutPaginatePrevious"]').first().simulate('click');
    expect(onPaginatePrevious).toHaveBeenCalled();
    wrapper.find('[data-test-subj="alertsFlyoutPaginateNext"]').first().simulate('click');
    expect(onPaginateNext).toHaveBeenCalled();
  });
});
