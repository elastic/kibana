/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { shallow } from 'enzyme';
import React from 'react';

import { ConditionsTable } from '.';
import { createItems, TEST_COLUMNS } from './test_utils';

describe('conditions_table', () => {
  describe('ConditionsTable', () => {
    it('should render single item table correctly', () => {
      const element = shallow(
        <ConditionsTable badge="and" columns={TEST_COLUMNS} items={createItems(1)} />
      );

      expect(element).toMatchSnapshot();
    });

    it('should render multi item table with and badge correctly', () => {
      const element = shallow(
        <ConditionsTable badge="and" columns={TEST_COLUMNS} items={createItems(3)} />
      );

      expect(element).toMatchSnapshot();
    });

    it('should render multi item table with or badge correctly', () => {
      const element = shallow(
        <ConditionsTable badge="or" columns={TEST_COLUMNS} items={createItems(3)} />
      );

      expect(element).toMatchSnapshot();
    });
  });
});
