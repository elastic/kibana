/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';
import { ActionCreator } from 'typescript-fsa';

import { IpOverviewType } from '../../../../graphql/types';

import { FlowTypeSelectComponent } from './flow_type_select';
import { IpOverviewId } from './index';

describe('Flow Type Select Connected Component', () => {
  describe('changing selected type', () => {
    const mockProps = {
      loading: false,
      flowType: IpOverviewType.source,
      updateIpOverviewFlowType: (jest.fn() as unknown) as ActionCreator<{
        flowType: IpOverviewType;
      }>,
    };
    test('renders pretty', () => {
      const wrapper = shallow(<FlowTypeSelectComponent {...mockProps} />);
      expect(toJson(wrapper)).toMatchSnapshot();
    });
    test('selecting destination from the type drop down', () => {
      const wrapper = mount(<FlowTypeSelectComponent {...mockProps} />);

      wrapper
        .find('button')
        .first()
        .simulate('click');

      wrapper.update();

      wrapper
        .find(`button#${IpOverviewId}-select-type-destination`)
        .first()
        .simulate('click');
      // @ts-ignore
      expect(mockProps.updateIpOverviewFlowType.mock.calls[0][0]).toEqual({
        flowType: 'destination',
      });
    });
    test('selecting source from the type drop down', () => {
      const wrapper = mount(<FlowTypeSelectComponent {...mockProps} />);

      wrapper
        .find('button')
        .first()
        .simulate('click');

      wrapper.update();

      wrapper
        .find(`button#${IpOverviewId}-select-type-source`)
        .first()
        .simulate('click');
      // @ts-ignore
      expect(mockProps.updateIpOverviewFlowType.mock.calls[1][0]).toEqual({ flowType: 'source' });
    });
  });
});
