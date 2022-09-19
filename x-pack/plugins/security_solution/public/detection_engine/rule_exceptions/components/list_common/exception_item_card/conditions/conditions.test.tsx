/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../../../common/mock';
import { ExceptionItemCardConditions } from './conditions';

describe('ExceptionItemCardConditions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });
  it('it includes os condition if one exists', () => {
    const wrapper = render(
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
    expect(wrapper.getByTestId('exceptionItemConditions-os')).toHaveTextContent('OSIS Linux');
    const conditions = wrapper.getAllByTestId('exceptionItemConditions-condition');
    expect(conditions[0]).toHaveTextContent('host.nameIS host');

    expect(conditions[1]).toHaveTextContent('AND threat.indicator.portexists');
    expect(conditions[2]).toHaveTextContent('AND file.Ext.code_signature validIS true');
  });

  it('it renders item conditions', () => {
    const wrapper = render(
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
              field: 'host.name',
              operator: 'excluded',
              type: 'match',
              value: 'host',
            },
            {
              field: 'host.name',
              operator: 'included',
              type: 'match_any',
              value: ['foo', 'bar'],
            },
            {
              field: 'host.name',
              operator: 'excluded',
              type: 'match_any',
              value: ['foo', 'bar'],
            },
            {
              field: 'user.name',
              operator: 'included',
              type: 'wildcard',
              value: 'foo*',
            },
            {
              field: 'user.name',
              operator: 'excluded',
              type: 'wildcard',
              value: 'foo*',
            },
            {
              field: 'threat.indicator.port',
              operator: 'included',
              type: 'exists',
            },
            {
              field: 'threat.indicator.port',
              operator: 'excluded',
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

    expect(wrapper.queryByTestId('exceptionItemConditions-os')).not.toBeInTheDocument();
    const conditions = wrapper.getAllByTestId('exceptionItemConditions-condition');
    expect(conditions[0]).toHaveTextContent('host.nameIS host');

    // Match
    expect(conditions[1]).toHaveTextContent('AND host.nameIS NOT host');
    // MATCH_ANY
    expect(conditions[2]).toHaveTextContent('AND host.nameis one of foobar');
    expect(conditions[3]).toHaveTextContent('AND host.nameis not one of foobar');

    // WILDCARD
    expect(conditions[4]).toHaveTextContent('AND user.nameMATCHES foo*');
    expect(conditions[5]).toHaveTextContent('AND user.nameDOES NOT MATCH foo*');

    // EXISTS
    expect(conditions[6]).toHaveTextContent('AND threat.indicator.portexists');
    expect(conditions[7]).toHaveTextContent('AND threat.indicator.portdoes not exist');

    // NESTED
    expect(conditions[8]).toHaveTextContent('AND file.Ext.code_signature validIS true');
  });

  it('it renders list conditions', () => {
    const wrapper = render(
      <TestProviders>
        <ExceptionItemCardConditions
          entries={[
            {
              field: 'host.name',
              list: {
                id: 'ips.txt',
                type: 'keyword',
              },
              operator: 'included',
              type: 'list',
            },
            {
              field: 'host.name',
              list: {
                id: 'ips.txt',
                type: 'keyword',
              },
              operator: 'excluded',
              type: 'list',
            },
          ]}
          dataTestSubj="exceptionItemConditions"
        />
      </TestProviders>
    );

    // Text is gonna look a bit off unformatted
    const conditions = wrapper.getAllByTestId('exceptionItemConditions-condition');
    expect(conditions[0]).toHaveTextContent('host.nameincluded in ips.txt');
    expect(conditions[1]).toHaveTextContent('ND host.nameis not included in ips.txt');
  });
});
