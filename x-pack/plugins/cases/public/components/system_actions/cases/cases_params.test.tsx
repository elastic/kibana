/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useApplication } from '../../../common/lib/kibana/use_application';
import { useAlertDataViews } from '../hooks/use_alert_data_view';
import { CasesParamsFields } from './cases_params';
import { showEuiComboBoxOptions } from '@elastic/eui/lib/test/rtl';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');
jest.mock('../../../common/lib/kibana/use_application');
jest.mock('../hooks/use_alert_data_view');

const useAlertDataViewsMock = useAlertDataViews as jest.Mock;
const useApplicationMock = useApplication as jest.Mock;

const actionParams = {
  subAction: 'run',
  subActionParams: {
    timeWindow: '6w',
    reopenClosedCases: false,
    groupingBy: [],
  },
};

const connector: ActionConnector = {
  id: 'test',
  actionTypeId: '.test',
  name: 'Test',
  isPreconfigured: false,
  isDeprecated: false,
  isSystemAction: true as const,
};
const editAction = jest.fn();
const defaultProps = {
  actionConnector: connector,
  actionParams,
  editAction,
  errors: { 'subActionParams.timeWindow.size': [] },
  index: 0,
  producerId: 'test',
};

describe('CasesParamsFields renders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useApplicationMock.mockReturnValueOnce({ appId: 'management' });
    useAlertDataViewsMock.mockReturnValue({
      loading: false,
      dataViews: [
        {
          title: '.alerts-test',
          fields: [
            {
              name: 'host.ip',
              type: 'ip',
              aggregatable: true,
            },
            {
              name: 'host.geo.location',
              type: 'geo_point',
            },
          ],
        },
      ],
    });
  });

  it('all params fields are rendered', async () => {
    render(<CasesParamsFields {...defaultProps} />);

    expect(await screen.findByTestId('group-by-alert-field-combobox')).toBeInTheDocument();
    expect(await screen.findByTestId('time-window-size-input')).toBeInTheDocument();
    expect(await screen.findByTestId('time-window-unit-select')).toBeInTheDocument();
    expect(await screen.findByTestId('reopen-case')).toBeInTheDocument();
  });

  it('renders loading state of grouping by fields correctly', async () => {
    useAlertDataViewsMock.mockReturnValue({ loading: true });
    render(<CasesParamsFields {...defaultProps} />);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
  });

  it('disables dropdown when loading grouping by fields', async () => {
    useAlertDataViewsMock.mockReturnValue({ loading: true });
    render(<CasesParamsFields {...defaultProps} />);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByTestId('comboBoxSearchInput')).toBeDisabled();
  });

  it('when subAction undefined, sets to default', () => {
    const newProps = {
      ...defaultProps,
      actionParams: {},
    };
    render(<CasesParamsFields {...newProps} />);

    expect(editAction.mock.calls[0][1]).toEqual('run');
  });

  it('when subActionParams undefined, sets to default', () => {
    const newProps = {
      ...defaultProps,
      actionParams: {
        subAction: 'run',
      },
    };
    render(<CasesParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1]).toEqual({
      timeWindow: '7d',
      reopenClosedCases: false,
      groupingBy: [],
    });
  });

  it('If timeWindow has errors, form row is invalid', async () => {
    const newProps = {
      ...defaultProps,
      errors: { timeWindow: ['error'] },
    };

    render(<CasesParamsFields {...newProps} />);

    expect(await screen.findByText('error')).toBeInTheDocument();
  });

  describe('UI updates', () => {
    it('renders grouping by field options', async () => {
      render(<CasesParamsFields {...defaultProps} />);

      userEvent.click(await screen.findByTestId('group-by-alert-field-combobox'));

      await showEuiComboBoxOptions();

      expect(await screen.findByText('host.ip')).toBeInTheDocument();

      expect(screen.queryByText('host.geo.location')).not.toBeInTheDocument();
    });

    it('updates grouping by field', async () => {
      render(<CasesParamsFields {...defaultProps} />);

      userEvent.click(await screen.findByTestId('group-by-alert-field-combobox'));

      await showEuiComboBoxOptions();

      expect(await screen.findByText('host.ip')).toBeInTheDocument();

      userEvent.click(await screen.findByText('host.ip'));

      expect(editAction.mock.calls[0][1].groupingBy).toEqual(['host.ip']);
    });

    it('updates grouping by field by search', async () => {
      useAlertDataViewsMock.mockReturnValue({
        loading: false,
        dataViews: [
          {
            title: '.alerts-test',
            fields: [
              {
                name: 'host.ip',
                type: 'ip',
                aggregatable: true,
              },
              {
                name: 'host.geo.location',
                type: 'geo_point',
              },
              {
                name: 'alert.name',
                type: 'string',
                aggregatable: true,
              },
            ],
          },
        ],
      });

      render(<CasesParamsFields {...defaultProps} />);

      userEvent.click(await screen.findByTestId('group-by-alert-field-combobox'));

      await showEuiComboBoxOptions();

      userEvent.type(await screen.findByTestId('comboBoxSearchInput'), 'alert.name{enter}');

      expect(editAction.mock.calls[0][1].groupingBy).toEqual(['alert.name']);
    });

    it('updates time window size', async () => {
      render(<CasesParamsFields {...defaultProps} />);

      expect(await screen.findByTestId('time-window-size-input')).toBeInTheDocument();

      userEvent.clear(await screen.findByTestId('time-window-size-input'));
      userEvent.paste(await screen.findByTestId('time-window-size-input'), '5');

      expect(editAction.mock.calls[0][1].timeWindow).toEqual('5w');
    });

    it('updates time window unit', async () => {
      render(<CasesParamsFields {...defaultProps} />);

      expect(await screen.findByTestId('time-window-unit-select')).toBeInTheDocument();

      fireEvent.change(await screen.findByTestId('time-window-unit-select'), {
        target: { value: 'M' },
      });

      expect(editAction.mock.calls[0][1].timeWindow).toEqual('6M');
    });

    it('updates reopenClosedCases', async () => {
      render(<CasesParamsFields {...defaultProps} />);

      expect(await screen.findByTestId('reopen-case')).toBeInTheDocument();

      userEvent.click(await screen.findByTestId('reopen-case'));

      expect(editAction.mock.calls[0][1].reopenClosedCases).toEqual(true);
    });
  });
});
