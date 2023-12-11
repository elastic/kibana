/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { RuleTagBadge } from './rule_tag_badge';

const onClickMock = jest.fn();
const onCloseMock = jest.fn();

const tags = ['a', 'b', 'c'];

describe('RuleTagBadge', () => {
  beforeEach(() => {
    onClickMock.mockReset();
    onCloseMock.mockReset();
  });

  it('renders the initial badge count correctly', () => {
    const wrapper = mountWithIntl(
      <RuleTagBadge isOpen={false} tags={tags} onClick={onClickMock} onClose={onCloseMock} />
    );

    expect(wrapper.find('[data-test-subj="ruleTagBadge"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="ruleTagBadge"]').first().text()).toEqual(
      `${tags.length}`
    );
  });

  it('can open and close the popover', () => {
    const { rerender, baseElement } = render(
      <RuleTagBadge isOpen={false} tags={tags} onClick={onClickMock} onClose={onCloseMock} />
    );

    expect(baseElement.querySelector('[data-test-subj="ruleTagBadgeItem-a"]')).toBe(null);
    expect(baseElement.querySelector('[data-test-subj="ruleTagBadgeItem-b"]')).toBe(null);
    expect(baseElement.querySelector('[data-test-subj="ruleTagBadgeItem-c"]')).toBe(null);

    fireEvent.click(baseElement.querySelector('[data-test-subj="ruleTagBadge"]')!);
    expect(onClickMock).toHaveBeenCalledTimes(1);

    rerender(
      <RuleTagBadge isOpen={true} tags={tags} onClick={onClickMock} onClose={onCloseMock} />
    );

    expect(baseElement.querySelector('[data-test-subj="ruleTagBadgeItem-a"]')).toBeTruthy();
    expect(baseElement.querySelector('[data-test-subj="ruleTagBadgeItem-b"]')).toBeTruthy();
    expect(baseElement.querySelector('[data-test-subj="ruleTagBadgeItem-c"]')).toBeTruthy();

    fireEvent.click(baseElement.querySelector('[data-test-subj="ruleTagBadge"]')!);
    expect(onClickMock).toHaveBeenCalledTimes(2);
  });

  it('shows all the tags without clicking when passing "spread" props with "true"', () => {
    const wrapper = mountWithIntl(<RuleTagBadge tags={tags} tagsOutPopover={true} />);
    expect(wrapper.find('[data-test-subj="tagsOutPopover"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="ruleTagBadgeItem-a"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="ruleTagBadgeItem-b"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="ruleTagBadgeItem-c"]').exists()).toBeTruthy();
  });
});
