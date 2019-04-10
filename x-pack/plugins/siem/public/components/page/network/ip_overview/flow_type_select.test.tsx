/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { ActionCreator } from 'typescript-fsa';

import { IpOverviewType } from '../../../../graphql/types';

import { FlowTypeSelectComponent } from './flow_type_select';

describe('Flow Type Select Connected Component', () => {
  describe('changing selected type', () => {
    const mockProps = {
      loading: false,
      flowType: IpOverviewType.source,
      updateIpOverviewFlowType: (jest.fn() as unknown) as ActionCreator<{
        flowType: IpOverviewType;
      }>,
    };
    test('selecting destination from the type drop down', () => {
      const wrapper = shallow(<FlowTypeSelectComponent {...mockProps} />);
      expect(toJson(wrapper)).toMatchSnapshot();
    });
    test('selecting destination from the type drop down', () => {
      const wrapper = shallow(<FlowTypeSelectComponent {...mockProps} />);
      const instance = wrapper.instance();
      // @ts-ignore
      instance.onChangeType('source');
      expect(mockProps.updateIpOverviewFlowType).toHaveBeenCalledWith({ flowType: 'source' });
    });
  });
});
