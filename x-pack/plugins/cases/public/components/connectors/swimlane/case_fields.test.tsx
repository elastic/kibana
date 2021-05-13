/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { connector } from '../mock';
import Fields from './case_fields';

jest.mock('../../../common/lib/kibana');

describe('SwimlaneParamsFields renders', () => {
  const fields = {
    alertSource: '1',
    caseId: '2',
    caseName: '3',
    severity: '4',
  };

  const onChange = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
  });

  Object.entries(fields).forEach(([k, v]) =>
    describe(`${k} tests`, () => {
      test(`param field is rendered`, () => {
        const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);
        expect(wrapper.find(`[data-test-subj="${k}"]`).first().prop('value')).toStrictEqual(v);
      });

      test(`onChange is called`, () => {
        const wrapper = mount(<Fields fields={fields} onChange={onChange} connector={connector} />);
        const newValue = 'wowie';
        wrapper
          .find(`input[data-test-subj="${k}"]`)
          .first()
          .simulate('change', {
            target: { value: newValue },
          });

        expect(onChange).toHaveBeenCalledWith({ ...fields, [k]: newValue });
      });
    })
  );
});
