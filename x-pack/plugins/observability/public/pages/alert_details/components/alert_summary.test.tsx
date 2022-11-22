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
import { alertWithTags, alertWithNoData, tags } from '../mock/alert';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

jest.mock('../../../utils/kibana_react');

describe('Alert summary', () => {
  jest
    .spyOn(useUiSettingHook, 'useUiSetting')
    .mockImplementation(() => 'MMM D, YYYY @ HH:mm:ss.SSS');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show alert data', async () => {
    const alertSummary = render(<AlertSummary alert={alertWithTags} />);

    expect(alertSummary.queryByText('1957')).toBeInTheDocument();
    expect(alertSummary.queryByText(asDuration(882076000))).toBeInTheDocument();
    expect(alertSummary.queryByText('Active')).toBeInTheDocument();
    expect(alertSummary.queryByText('Sep 2, 2021 @ 08:54:09.674')).toBeInTheDocument();
    expect(
      alertSummary.getByText('Sep 2, 2021 @ 09:08:51.750', { exact: false })
    ).toBeInTheDocument();
    expect(alertSummary.queryByText(tags[0])).toBeInTheDocument();
  });

  it('should show empty "-" for fields when no data available', async () => {
    const alertSummary = render(<AlertSummary alert={alertWithNoData} />);

    expect(alertSummary.queryByTestId('noAlertStatus')).toBeInTheDocument();
    expect(alertSummary.queryByTestId('noAlertStatus')).toHaveTextContent('-');
  });
});
