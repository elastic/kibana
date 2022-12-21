/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';
import { ReactWrapper } from 'enzyme';
import { RuleConditionsGroup } from './rule_conditions_group';
import { EuiFormRow, EuiButtonIcon } from '@elastic/eui';

describe('rule_conditions_group', () => {
  async function setup(element: React.ReactElement): Promise<ReactWrapper<unknown>> {
    const wrapper = mountWithIntl(element);

    // Wait for active space to resolve before requesting the component to update
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    return wrapper;
  }

  it('renders with actionGroup name as label', async () => {
    const InnerComponent = () => <div>{'inner component'}</div>;
    const wrapper = await setup(
      <RuleConditionsGroup
        actionGroup={{
          id: 'myGroup',
          name: 'My Group',
        }}
      >
        <InnerComponent />
      </RuleConditionsGroup>
    );

    expect(wrapper.find(EuiFormRow).prop('label')).toMatchInlineSnapshot(`
      <EuiTitle
        size="s"
      >
        <strong>
          My Group
        </strong>
      </EuiTitle>
    `);
    expect(wrapper.find(InnerComponent).prop('actionGroup')).toMatchInlineSnapshot(`
      Object {
        "id": "myGroup",
        "name": "My Group",
      }
    `);
  });

  it('renders a reset button when onResetConditionsFor is specified', async () => {
    const onResetConditionsFor = jest.fn();
    const wrapper = await setup(
      <RuleConditionsGroup
        actionGroup={{
          id: 'myGroup',
          name: 'My Group',
        }}
        onResetConditionsFor={onResetConditionsFor}
      >
        <div>{'inner component'}</div>
      </RuleConditionsGroup>
    );

    expect(wrapper.find(EuiButtonIcon).prop('aria-label')).toMatchInlineSnapshot(`"Remove"`);

    wrapper.find(EuiButtonIcon).simulate('click');

    expect(onResetConditionsFor).toHaveBeenCalledWith({
      id: 'myGroup',
      name: 'My Group',
    });
  });

  it('shouldnt render a reset button when isRequired is true', async () => {
    const onResetConditionsFor = jest.fn();
    const wrapper = await setup(
      <RuleConditionsGroup
        actionGroup={{
          id: 'myGroup',
          name: 'My Group',
          conditions: true,
          isRequired: true,
        }}
        onResetConditionsFor={onResetConditionsFor}
      >
        <div>{'inner component'}</div>
      </RuleConditionsGroup>
    );

    expect(wrapper.find(EuiButtonIcon).length).toEqual(0);
  });
});
