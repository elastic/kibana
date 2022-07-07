/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { TestProviders } from '../../../../mock';
import { ExceptionItemCardConditions } from './exception_item_card_conditions';

describe('ExceptionItemCardConditions', () => {
  it('it includes os condition if one exists', () => {
    const wrapper = mount(
      <TestProviders>
        <ExceptionItemCardConditions
          os={['linux']}
          entries={[
            {
              field: 'host.name',
              operator: 'included',
              type: 'match',
              value: 'host',
            },
            {
              field: 'threat.indicator.port',
              operator: 'included',
              type: 'exists',
            },
            {
              entries: [
                {
                  field: 'valid',
                  operator: 'included',
                  type: 'match',
                  value: 'true',
                },
              ],
              field: 'file.Ext.code_signature',
              type: 'nested',
            },
          ]}
          dataTestSubj="exceptionItemConditions"
        />
      </TestProviders>
    );

    // Text is gonna look a bit off unformatted
    expect(
      wrapper.find('[data-test-subj="exceptionItemConditions-os"]').at(0).text()
    ).toEqual(' OSIS Linux');
    expect(
      wrapper.find('[data-test-subj="exceptionItemConditions-condition"]').at(0).text()
    ).toEqual(' host.nameIS host');
    expect(
      wrapper.find('[data-test-subj="exceptionItemConditions-condition"]').at(1).text()
    ).toEqual('AND threat.indicator.portexists ');
    expect(
      wrapper.find('[data-test-subj="exceptionItemConditions-condition"]').at(2).text()
    ).toEqual('AND file.Ext.code_signature  validIS true');
  });

  it('it renders item conditions', () => {
    const wrapper = mount(
      <TestProviders>
        <ExceptionItemCardConditions
          entries={[
            {
              field: 'host.name',
              operator: 'included',
              type: 'match',
              value: 'host',
            },
            {
              field: 'threat.indicator.port',
              operator: 'included',
              type: 'exists',
            },
            {
              entries: [
                {
                  field: 'valid',
                  operator: 'included',
                  type: 'match',
                  value: 'true',
                },
              ],
              field: 'file.Ext.code_signature',
              type: 'nested',
            },
          ]}
          dataTestSubj="exceptionItemConditions"
        />
      </TestProviders>
    );

    // Text is gonna look a bit off unformatted
    expect(
      wrapper.find('[data-test-subj="exceptionItemConditions-os"]').exists()
    ).toBeFalsy();
    expect(
      wrapper.find('[data-test-subj="exceptionItemConditions-condition"]').at(0).text()
    ).toEqual(' host.nameIS host');
    expect(
      wrapper.find('[data-test-subj="exceptionItemConditions-condition"]').at(1).text()
    ).toEqual('AND threat.indicator.portexists ');
    expect(
      wrapper.find('[data-test-subj="exceptionItemConditions-condition"]').at(2).text()
    ).toEqual('AND file.Ext.code_signature  validIS true');
  });
});
