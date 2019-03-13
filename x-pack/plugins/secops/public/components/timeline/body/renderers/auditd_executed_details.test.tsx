/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import toJson from 'enzyme-to-json';
import * as React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';

import { mockEcsData, TestProviders } from '../../../../mock';

import { AuditdExecutedDetails } from './auditd_executed_details';

describe('AuditExecutedDetails', () => {
  describe('rendering', () => {
    test('it renders the default AuditExecutedDetails', () => {
      const wrapper = shallowWithIntl(
        <TestProviders>
          <AuditdExecutedDetails data={mockEcsData[19]} />
        </TestProviders>
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it returns auditd executed if the data does contain auditd executed data', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdExecutedDetails data={mockEcsData[19]} />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('johnson@zeek-sanfran:/>gpgconf--list-dirs agent-socket');
    });

    test('it returns null for text if the data contains no auditd executed data', () => {
      const wrapper = mountWithIntl(
        <TestProviders>
          <AuditdExecutedDetails data={mockEcsData[0]} />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(null);
    });
  });
});
