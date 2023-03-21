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
import { alertWithTags } from '../mock/alert';
import { alertSummaryFieldsMock } from '../mock/alert_summary_fields';

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
    const alertSummary = render(<AlertSummary alertSummaryFields={alertSummaryFieldsMock} />);

    expect(alertSummary.queryByText('Actual value')).toBeInTheDocument();
    expect(alertSummary.queryByText(alertWithTags.fields['kibana.alert.evaluation.value']!));
    expect(alertSummary.queryByText('Expected value')).toBeInTheDocument();
    expect(alertSummary.queryByText(alertWithTags.fields['kibana.alert.evaluation.threshold']!));
  });
});
