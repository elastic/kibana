/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import {
  act,
  fireEvent,
  render,
  waitFor,
  within,
  screen,
  findByText,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useApplication } from '../../../common/lib/kibana/use_application';
import { useAlertDataViews } from '../hooks/use_alert_data_view';
import CasesParamsFields from './cases_params';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

jest.mock('@kbn/triggers-actions-ui-plugin/public/common/lib/kibana');
jest.mock('../../../common/lib/kibana/use_application');
jest.mock('../hooks/use_alert_data_view');

const useAlertDataViewsMock = useAlertDataViews as jest.Mock;
const useApplicationMock = useApplication as jest.Mock;

const actionParams = {
  subAction: 'run',
  subActionParams: {
    owner: 'cases',
    timeWindow: '6w',
    reopenClosedCases: false,
    groupingBy: [''],
  },
};

const connector: ActionConnector = {
  secrets: {},
  config: {},
  id: 'test',
  actionTypeId: '.test',
  name: 'Test',
  isPreconfigured: false,
  isDeprecated: false,
  isSystemAction: false as const,
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
    useApplicationMock.mockReturnValue({ appId: 'management' });
    useAlertDataViewsMock.mockReturnValue({
      loading: false,
      dataViews: [
        {
          title: '.alerts-test',
          fields: [
            {
              name: 'host.ip',
              type: 'ip',
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

    expect(await screen.findByTestId('group-by-alert-field')).toBeInTheDocument();
    expect(await screen.findByTestId('time-window-size-input')).toBeInTheDocument();
    expect(await screen.findByTestId('time-window-unit-select')).toBeInTheDocument();
    expect(await screen.findByTestId('reopen-case')).toBeInTheDocument();
  });

  it('disables dropdown when loading grouping by fields', async () => {
    useAlertDataViewsMock.mockReturnValue({ loading: true });
    render(<CasesParamsFields {...defaultProps} />);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByTestId('group-by-alert-field')).toHaveProperty('disabled');
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
      groupingBy: [''],
      owner: 'cases',
    });
  });

  it('sets owner as undefined if appId not matched', () => {
    useApplicationMock.mockReturnValue({ appId: 'testAppId' });
    const newProps = {
      ...defaultProps,
      actionParams: {
        subAction: 'run',
      },
    };
    render(<CasesParamsFields {...newProps} />);
    expect(editAction.mock.calls[0][1].owner).toBeUndefined();
  });

  describe('UI updates', () => {
    it('renders grouping by field options', async () => {
      render(<CasesParamsFields {...defaultProps} />);

      userEvent.click(await screen.findByTestId('group-by-alert-field'));

      expect(await screen.findByTestId('group-by-alert-field-host.ip')).toBeInTheDocument();

      expect(
        await screen.findByTestId('group-by-alert-field-host.geo.location')
      ).toBeInTheDocument();
    });

    it('updates grouping by field ', async () => {
      render(<CasesParamsFields {...defaultProps} />);

      userEvent.click(await screen.findByTestId('group-by-alert-field'));
      await waitForEuiPopoverOpen();

      expect(await screen.findByTestId('group-by-alert-field-host.ip')).toBeInTheDocument();

      userEvent.click(await screen.findByTestId('group-by-alert-field-host.ip'));

      expect(editAction.mock.calls[0][1].groupingBy).toEqual(['host.ip']);
    });
  });
});
