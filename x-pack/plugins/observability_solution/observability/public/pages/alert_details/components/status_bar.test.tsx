/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  ALERT_RULE_NAME,
  ALERT_STATUS,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
  AlertStatus,
} from '@kbn/rule-data-utils';
import { render } from '../../../utils/test_helper';
import { alertWithGroupsAndTags } from '../mock/alert';
import { useKibana } from '../../../utils/kibana_react';
import { kibanaStartMock } from '../../../utils/kibana_react.mock';
import { StatusBar, StatusBarProps } from './status_bar';

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

describe('Source bar', () => {
  const renderComponent = (props: StatusBarProps) => {
    return render(<StatusBar {...props} />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
  });

  it('should show alert data', async () => {
    const statusBar = renderComponent({
      alert: alertWithGroupsAndTags,
      alertStatus: alertWithGroupsAndTags.fields[ALERT_STATUS] as AlertStatus,
    });

    expect(
      statusBar.queryByText(alertWithGroupsAndTags.fields[ALERT_RULE_NAME])
    ).toBeInTheDocument();
    expect(statusBar.getByText('Active')).toBeTruthy();
  });

  it('should display a recovered badge when alert is recovered', async () => {
    const updatedProps = {
      alert: {
        ...alertWithGroupsAndTags,
        fields: {
          ...alertWithGroupsAndTags.fields,
          [ALERT_STATUS]: ALERT_STATUS_RECOVERED,
        },
      },
      alertStatus: ALERT_STATUS_RECOVERED as AlertStatus,
    };

    const { getByText } = renderComponent({ ...updatedProps });
    expect(getByText('Recovered')).toBeTruthy();
  });

  it('should display an untracked badge when alert is untracked', async () => {
    const updatedProps = {
      alert: {
        ...alertWithGroupsAndTags,
        fields: {
          ...alertWithGroupsAndTags.fields,
          [ALERT_STATUS]: ALERT_STATUS_UNTRACKED,
        },
      },
      alertStatus: ALERT_STATUS_UNTRACKED as AlertStatus,
    };

    const { getByText } = renderComponent({ ...updatedProps });
    expect(getByText('Untracked')).toBeTruthy();
  });
});
