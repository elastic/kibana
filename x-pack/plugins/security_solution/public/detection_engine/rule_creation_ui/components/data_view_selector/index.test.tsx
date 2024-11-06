/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';

import { DataViewSelector } from '.';
import type { DataViewSelectorProps } from '.';
import { TestProviders, useFormFieldMock } from '../../../../common/mock';

jest.mock('../../../../common/lib/kibana');

describe('data_view_selector', () => {
  let mockField: DataViewSelectorProps['field'];

  beforeEach(() => {
    mockField = useFormFieldMock<string | undefined>({
      value: undefined,
    });
  });

  it('renders correctly', () => {
    const Component = () => {
      return <DataViewSelector kibanaDataViews={{}} field={mockField} />;
    };
    const wrapper = shallow(<Component />);

    expect(wrapper.dive().find('[data-test-subj="pick-rule-data-source"]')).toHaveLength(1);
  });

  it('displays alerts on alerts warning when default security view selected', () => {
    const wrapper = mount(
      <TestProviders>
        <DataViewSelector
          kibanaDataViews={{
            'security-solution-default': {
              id: 'security-solution-default',
              title:
                '-*elastic-cloud-logs-*,.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*',
            },
            '1234': {
              id: '1234',
              title: 'logs-*',
            },
          }}
          field={useFormFieldMock<string | undefined>({
            value: 'security-solution-default',
          })}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="defaultSecurityDataViewWarning"]').exists()).toBeTruthy();
  });

  it('does not display alerts on alerts warning when default security view is not selected', () => {
    const wrapper = mount(
      <TestProviders>
        <DataViewSelector
          kibanaDataViews={{
            'security-solution-default': {
              id: 'security-solution-default',
              title:
                '-*elastic-cloud-logs-*,.alerts-security.alerts-default,apm-*-transaction*,auditbeat-*,endgame-*,filebeat-*,logs-*,packetbeat-*,traces-apm*,winlogbeat-*',
            },
            '1234': {
              id: '1234',
              title: 'logs-*',
            },
          }}
          field={useFormFieldMock<string | undefined>({
            value: '1234',
          })}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="defaultSecurityDataViewWarning"]').exists()).toBeFalsy();
  });
});
