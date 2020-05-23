/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { RuleActionsField } from './index';
import { useKibana } from '../../../../../lib/kibana';
import { useFormFieldMock } from '../../../../../mock';
jest.mock('../../../../../lib/kibana');

describe('RuleActionsField', () => {
  it('should not render ActionForm is no actions are supported', () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        triggers_actions_ui: {
          actionTypeRegistry: {},
        },
      },
    });
    const Component = () => {
      const field = useFormFieldMock();

      return <RuleActionsField euiFieldProps={{ options: [] }} field={field} />;
    };
    const wrapper = shallow(<Component />);

    expect(wrapper.dive().find('ActionForm')).toHaveLength(0);
  });
});
