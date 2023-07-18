/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { getRulesSchemaMock } from '../../../../../../../common/api/detection_engine/model/rule_schema/mocks';

import { LinkRuleSwitch } from '.';

const mockedRule = getRulesSchemaMock();
const linkedRules = Array(3).fill(mockedRule);
const onRuleLinkChangeMock = jest.fn();
describe('LinkRuleSwitch', () => {
  it('should render the switch checked if rule is linked', () => {
    const { getByRole } = render(
      <LinkRuleSwitch
        rule={linkedRules[0]}
        linkedRules={linkedRules}
        onRuleLinkChange={onRuleLinkChangeMock}
      />
    );
    const switchComponent = getByRole('switch');
    expect(switchComponent).toBeChecked();
  });
  it('should render the switch unchecked if rule is unlinked', () => {
    const { getByRole } = render(
      <LinkRuleSwitch
        rule={linkedRules[0]}
        linkedRules={[]}
        onRuleLinkChange={onRuleLinkChangeMock}
      />
    );
    const switchComponent = getByRole('switch');
    expect(switchComponent).not.toBeChecked();
  });
  it('should link rule if not linked before', () => {
    const { getByRole } = render(
      <LinkRuleSwitch
        rule={linkedRules[0]}
        linkedRules={[]}
        onRuleLinkChange={onRuleLinkChangeMock}
      />
    );
    const switchComponent = getByRole('switch');
    expect(switchComponent).not.toBeChecked();
    fireEvent.click(switchComponent);
    expect(onRuleLinkChangeMock).toBeCalledWith([linkedRules[0]]);
  });
  it('should unlink rule if it was linked before', () => {
    const { getByRole } = render(
      <LinkRuleSwitch
        rule={linkedRules[0]}
        linkedRules={linkedRules}
        onRuleLinkChange={onRuleLinkChangeMock}
      />
    );
    const switchComponent = getByRole('switch');
    expect(switchComponent).toBeChecked();
    fireEvent.click(switchComponent);
    expect(onRuleLinkChangeMock).toBeCalledWith([]);
  });
});
