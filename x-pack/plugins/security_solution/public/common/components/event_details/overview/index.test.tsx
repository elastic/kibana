/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Overview } from './';
import { TestProviders } from '../../../../common/mock';

jest.mock('../../../lib/kibana');
jest.mock('../../utils', () => ({
  useThrottledResizeObserver: () => ({ width: 400 }), // force row-chunking
}));

describe('Event Details Overview Cards', () => {
  it('renders all cards', () => {
    const { getByText } = render(
      <TestProviders>
        <Overview {...props} />
      </TestProviders>
    );

    getByText('Status');
    getByText('Severity');
    getByText('Risk Score');
    getByText('Rule');
  });

  it('renders only readOnly cards', () => {
    const { getByText, queryByText } = render(
      <TestProviders>
        <Overview {...propsWithReadOnly} />
      </TestProviders>
    );

    getByText('Severity');
    getByText('Risk Score');

    expect(queryByText('Status')).not.toBeInTheDocument();
    expect(queryByText('Rule')).not.toBeInTheDocument();
  });

  it('renders all cards it has data for', () => {
    const { getByText, queryByText } = render(
      <TestProviders>
        <Overview {...propsWithoutSeverity} />
      </TestProviders>
    );

    getByText('Status');
    getByText('Risk Score');
    getByText('Rule');

    expect(queryByText('Severity')).not.toBeInTheDocument();
  });

  it('renders rows and spacers correctly', () => {
    const { asFragment } = render(
      <TestProviders>
        <Overview {...propsWithoutSeverity} />
      </TestProviders>
    );

    expect(asFragment()).toMatchSnapshot();
  });
});

const props = {
  handleOnEventClosed: jest.fn(),
  contextId: 'detections-page',
  eventId: 'testId',
  indexName: 'testIndex',
  timelineId: 'page',
  data: [
    {
      category: 'kibana',
      field: 'kibana.alert.risk_score',
      values: ['47'],
      originalValue: ['47'],
      isObjectArray: false,
    },
    {
      category: 'kibana',
      field: 'kibana.alert.rule.uuid',
      values: ['d9f537c0-47b2-11ec-9517-c1c68c44dec0'],
      originalValue: ['d9f537c0-47b2-11ec-9517-c1c68c44dec0'],
      isObjectArray: false,
    },
    {
      category: 'kibana',
      field: 'kibana.alert.workflow_status',
      values: ['open'],
      originalValue: ['open'],
      isObjectArray: false,
    },
    {
      category: 'kibana',
      field: 'kibana.alert.rule.name',
      values: ['More than one event with user name'],
      originalValue: ['More than one event with user name'],
      isObjectArray: false,
    },
    {
      category: 'kibana',
      field: 'kibana.alert.severity',
      values: ['medium'],
      originalValue: ['medium'],
      isObjectArray: false,
    },
  ],
  browserFields: {
    kibana: {
      fields: {
        'kibana.alert.severity': {
          category: 'kibana',
          count: 0,
          name: 'kibana.alert.severity',
          type: 'string',
          esTypes: ['keyword'],
          scripted: false,
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
          format: 'string',
          shortDotsEnable: false,
          isMapped: true,
          indexes: ['apm-*-transaction*'],
        },
        'kibana.alert.risk_score': {
          category: 'kibana',
          count: 0,
          name: 'kibana.alert.risk_score',
          type: 'number',
          esTypes: ['float'],
          scripted: false,
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
          format: 'number',
          shortDotsEnable: false,
          isMapped: true,
          indexes: ['apm-*-transaction*'],
        },
        'kibana.alert.rule.uuid': {
          category: 'kibana',
          count: 0,
          name: 'kibana.alert.rule.uuid',
          type: 'string',
          esTypes: ['keyword'],
          scripted: false,
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
          format: 'string',
          shortDotsEnable: false,
          isMapped: true,
          indexes: ['apm-*-transaction*'],
        },
        'kibana.alert.workflow_status': {
          category: 'kibana',
          count: 0,
          name: 'kibana.alert.workflow_status',
          type: 'string',
          esTypes: ['keyword'],
          scripted: false,
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
          format: 'string',
          shortDotsEnable: false,
          isMapped: true,
          indexes: ['apm-*-transaction*'],
        },
        'kibana.alert.rule.name': {
          category: 'kibana',
          count: 0,
          name: 'kibana.alert.rule.name',
          type: 'string',
          esTypes: ['keyword'],
          scripted: false,
          searchable: true,
          aggregatable: true,
          readFromDocValues: true,
          format: 'string',
          shortDotsEnable: false,
          isMapped: true,
          indexes: ['apm-*-transaction*'],
        },
      },
    },
  },
};

const dataWithoutSeverity = props.data.filter((data) => data.field !== 'kibana.alert.severity');

const fieldsWithoutSeverity = {
  'kibana.alert.risk_score': props.browserFields.kibana.fields['kibana.alert.risk_score'],
  'kibana.alert.rule.uuid': props.browserFields.kibana.fields['kibana.alert.rule.uuid'],
  'kibana.alert.workflow_status': props.browserFields.kibana.fields['kibana.alert.workflow_status'],
  'kibana.alert.rule.name': props.browserFields.kibana.fields['kibana.alert.rule.name'],
};

const propsWithoutSeverity = {
  ...props,
  browserFields: { kibana: { fields: fieldsWithoutSeverity } },
  data: dataWithoutSeverity,
};

const propsWithReadOnly = {
  ...props,
  isReadOnly: true,
};
