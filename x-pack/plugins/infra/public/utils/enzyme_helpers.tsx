/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, ReactWrapper } from 'enzyme';
import React from 'react';
import { act as reactAct } from 'react-dom/test-utils';
/**
 * A wrapper object to provide access to the state of a hook under test and to
 * enable interaction with that hook.
 */
interface ReactHookWrapper<Args, HookValue> {
  /* Ensures that async React operations have settled before and after the
   * given actor callback is called. The actor callback arguments provide easy
   * access to the last hook value and allow for updating the arguments passed
   * to the hook body to trigger reevaluation.
   */
  act: (actor: (lastHookValue: HookValue, setArgs: (args: Args) => void) => void) => void;
  /* The enzyme wrapper around the test component. */
  component: ReactWrapper;
  /* The most recent value return the by test harness of the hook. */
  getLastHookValue: () => HookValue;
  /* The jest Mock function that receives the hook values for introspection. */
  hookValueCallback: jest.Mock;
}

/**
 * Allows for execution of hooks inside of a test component which records the
 * returned values.
 *
 * @param body A function that calls the hook and returns data derived from it
 * @param WrapperComponent A component that, if provided, will be wrapped
 * around the test component. This can be useful to provide context values.
 * @return {ReactHookWrapper} An object providing access to the hook state and
 * functions to interact with it.
 */
export const mountHook = <Args extends {}, HookValue extends any>(
  body: (args: Args) => HookValue,
  WrapperComponent?: React.ComponentType,
  initialArgs: Args = {} as Args
): ReactHookWrapper<Args, HookValue> => {
  const hookValueCallback = jest.fn();
  let component!: ReactWrapper;

  const act: ReactHookWrapper<Args, HookValue>['act'] = actor => {
    reactAct(() => {
      actor(getLastHookValue(), (args: Args) => component.setProps(args));
      component.update();
    });
  };

  const getLastHookValue = () => {
    const calls = hookValueCallback.mock.calls;
    if (calls.length <= 0) {
      throw Error('No recent hook value present.');
    }
    return calls[calls.length - 1][0];
  };

  const HookComponent = (props: Args) => {
    hookValueCallback(body(props));
    return null;
  };
  const TestComponent: React.FunctionComponent<Args> = args =>
    WrapperComponent ? (
      <WrapperComponent>
        <HookComponent {...args} />
      </WrapperComponent>
    ) : (
      <HookComponent {...args} />
    );

  reactAct(() => {
    component = mount(<TestComponent {...initialArgs} />);
  });

  return {
    act,
    component,
    getLastHookValue,
    hookValueCallback,
  };
};
