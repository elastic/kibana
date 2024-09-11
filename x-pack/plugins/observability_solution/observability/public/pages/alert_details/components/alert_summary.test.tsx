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
import { alertWithGroupsAndTags } from '../mock/alert';
import { alertSummaryFieldsMock } from '../mock/alert_summary_fields';
import { useKibana } from '../../../utils/kibana_react';
import { kibanaStartMock } from '../../../utils/kibana_react.mock';
import { Group } from '../../../../common/typings';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_GROUP,
  ALERT_RULE_NAME,
  TAGS,
} from '@kbn/rule-data-utils';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

jest.mock('../../../utils/kibana_react');

const useKibanaMock = useKibana as jest.Mock;

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      ...kibanaStartMock.startContract().services,
      http: {
        basePath: {
          prepend: jest.fn(),
        },
      },
    },
  });
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
    const alertSummary = render(
      <AlertSummary alert={alertWithGroupsAndTags} alertSummaryFields={alertSummaryFieldsMock} />
    );

    const groups = alertWithGroupsAndTags.fields[ALERT_GROUP] as Group[];

    expect(alertSummary.queryByText('Source')).toBeInTheDocument();
    expect(alertSummary.queryByText(groups[0].field, { exact: false })).toBeInTheDocument();
    expect(alertSummary.queryByText(groups[0].value)).toBeInTheDocument();
    expect(alertSummary.queryByText(groups[1].field, { exact: false })).toBeInTheDocument();
    expect(alertSummary.queryByText(groups[1].value)).toBeInTheDocument();
    expect(alertSummary.queryByText('Tags')).toBeInTheDocument();
    expect(alertSummary.queryByText(alertWithGroupsAndTags.fields[TAGS]![0])).toBeInTheDocument();
    expect(alertSummary.queryByText('Rule')).toBeInTheDocument();
    expect(
      alertSummary.queryByText(alertWithGroupsAndTags.fields[ALERT_RULE_NAME])
    ).toBeInTheDocument();
    expect(alertSummary.queryByText('Actual value')).toBeInTheDocument();
    expect(alertSummary.queryByText(alertWithGroupsAndTags.fields[ALERT_EVALUATION_VALUE]!));
    expect(alertSummary.queryByText('Expected value')).toBeInTheDocument();
    expect(alertSummary.queryByText(alertWithGroupsAndTags.fields[ALERT_EVALUATION_THRESHOLD]!));
  });
});
