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
import { showEuiComboBoxOptions } from '@elastic/eui/lib/test/rtl';
import { useAlertsDataView } from '@kbn/alerts-ui-shared/src/common/hooks/use_alerts_data_view';
import { useApplication } from '../../../common/lib/kibana/use_application';
import { CasesParamsFields } from './cases_params';
import { useKibana } from '../../../common/lib/kibana/kibana_react';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';

jest.mock('@kbn/alerts-ui-shared/src/common/hooks/use_alerts_data_view');
jest.mock('../../../common/lib/kibana/use_application');
jest.mock('../../../common/lib/kibana/kibana_react');

const useKibanaMock = jest.mocked(useKibana);
const useAlertsDataViewMock = jest.mocked(useAlertsDataView);
const useApplicationMock = useApplication as jest.Mock;

useKibanaMock.mockReturnValue({
  services: { ...createStartServicesMock(), data: { dataViews: {} } },
} as unknown as ReturnType<typeof useKibana>);

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
    useAlertsDataViewMock.mockReturnValue({
      isLoading: false,
      dataView: {
        title: '.alerts-test',
        fields: [
          {
            name: 'host.ip',
            type: 'ip',
            aggregatable: true,
            searchable: true,
          },
          {
            name: 'host.geo.location',
            type: 'geo_point',
            aggregatable: false,
            searchable: true,
          },
        ],
      },
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
    useAlertsDataViewMock.mockReturnValue({ isLoading: true });
    render(<CasesParamsFields {...defaultProps} />);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
  });

  it('disables dropdown when loading grouping by fields', async () => {
    useAlertsDataViewMock.mockReturnValue({ isLoading: true });
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
      useAlertsDataViewMock.mockReturnValue({
        isLoading: false,
        dataView: {
          title: '.alerts-test',
          fields: [
            {
              name: 'host.ip',
              type: 'ip',
              aggregatable: true,
              searchable: true,
            },
            {
              name: 'host.geo.location',
              type: 'geo_point',
              aggregatable: false,
              searchable: true,
            },
            {
              name: 'alert.name',
              type: 'string',
              aggregatable: true,
              searchable: true,
            },
          ],
        },
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
        target: { value: 'd' },
      });

      expect(editAction.mock.calls[0][1].timeWindow).toEqual('6d');
    });

    it('updates reopenClosedCases', async () => {
      render(<CasesParamsFields {...defaultProps} />);

      expect(await screen.findByTestId('reopen-case')).toBeInTheDocument();

      userEvent.click(await screen.findByTestId('reopen-case'));

      expect(editAction.mock.calls[0][1].reopenClosedCases).toEqual(true);
    });
  });
});
