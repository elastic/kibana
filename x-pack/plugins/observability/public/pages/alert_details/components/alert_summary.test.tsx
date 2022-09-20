/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as useUiSettingHook from '@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting';
import { render } from '../../../utils/test_helper';
import { AlertSummary } from './alert_summary';
import { asDuration } from '../../../../common/utils/formatters';
import moment from 'moment';
import { kibanaStartMock } from '../../../utils/kibana_react.mock';
import { useKibana } from '../../../utils/kibana_react';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { waitFor } from '@testing-library/react';
import { DEFAULT_DATE_FORMAT } from '../constants';
import { alertWithTags, alertWithNoData, tags } from '../mock';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

const mockUseKibanaReturnValue = kibanaStartMock.startContract();

jest.mock('../../../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;
const mockTriggersActionsUiService = triggersActionsUiMock.createStart();

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      ...kibanaStartMock.startContract(),
      triggersActionsUi: mockTriggersActionsUiService,
    },
  } as unknown as ReturnType<typeof useKibana>);
};

describe('Alert summary', () => {
  jest
    .spyOn(useUiSettingHook, 'useUiSetting')
    .mockImplementation(() => 'MMM D, YYYY @ HH:mm:ss.SSS');

  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
  });

  it('should show alert data', async () => {
    const alertSummary = render(<AlertSummary alert={alertWithTags} />);

    expect(alertSummary.queryByTestId('alertId')).toHaveTextContent(
      '756240e5-92fb-452f-b08e-cd3e0dc51738'
    );
    expect(alertSummary.queryByText('1957')).toBeInTheDocument();
    expect(alertSummary.queryByText(asDuration(882076000))).toBeInTheDocument();
    expect(alertSummary.queryByText('Active')).toBeInTheDocument();
    expect(
      alertSummary.queryByText(moment('2021-09-02T12:54:09.674Z').format(DEFAULT_DATE_FORMAT))
    ).toBeInTheDocument();
    const lastStatusUpdate = moment('2021-09-02T13:08:51.750Z').format(DEFAULT_DATE_FORMAT);
    expect(alertSummary.getByText(lastStatusUpdate, { exact: false })).toBeInTheDocument();
    await waitFor(() => expect(alertSummary.queryByTestId('tagsOutPopover')).toBeInTheDocument());
    expect(alertSummary.queryByText(tags[0])).toBeInTheDocument();
  });

  it('should show empty "-" for fields when no data available', async () => {
    const alertSummary = render(<AlertSummary alert={alertWithNoData} />);

    expect(alertSummary.queryByTestId('alertId')).toHaveTextContent('-');
    await waitFor(() =>
      expect(alertSummary.queryByTestId('tagsOutPopover')).not.toBeInTheDocument()
    );
  });
});
