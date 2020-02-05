/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as React from 'react';
import { shallow, mount } from 'enzyme';
import { withActionOperations, ComponentOpts } from './with_actions_api_operations';
import * as actionApis from '../../../lib/action_connector_api';
import { useAppDependencies } from '../../../app_context';

jest.mock('../../../lib/action_connector_api');

jest.mock('../../../app_context', () => {
  const http = jest.fn();
  return {
    useAppDependencies: jest.fn(() => ({
      http,
    })),
  };
});

describe('with_action_api_operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('extends any component with Action Api methods', () => {
    const ComponentToExtend = (props: ComponentOpts) => {
      expect(typeof props.loadActionTypes).toEqual('function');
      return <div />;
    };

    const ExtendedComponent = withActionOperations(ComponentToExtend);
    expect(shallow(<ExtendedComponent />).type()).toEqual(ComponentToExtend);
  });

  it('loadActionTypes calls the loadActionTypes api', () => {
    const { http } = useAppDependencies();
    const ComponentToExtend = ({ loadActionTypes }: ComponentOpts) => {
      return <button onClick={() => loadActionTypes()}>{'call api'}</button>;
    };

    const ExtendedComponent = withActionOperations(ComponentToExtend);
    const component = mount(<ExtendedComponent />);
    component.find('button').simulate('click');

    expect(actionApis.loadActionTypes).toHaveBeenCalledTimes(1);
    expect(actionApis.loadActionTypes).toHaveBeenCalledWith({ http });
  });
});
