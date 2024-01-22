/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  AlertStatus,
  ALERT_RULE_CATEGORY,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
} from '@kbn/rule-data-utils';
import { PageTitle, PageTitleProps } from './page_title';
import { alert } from '../mock/alert';

describe('Page Title', () => {
  const defaultProps = {
    alert,
    alertStatus: ALERT_STATUS_ACTIVE as AlertStatus,
    dataTestSubj: 'ruleTypeId',
  };

  const renderComp = (props: PageTitleProps) => {
    return render(
      <IntlProvider locale="en">
        <PageTitle {...props} />
      </IntlProvider>
    );
  };

  it('should display Log threshold title', () => {
    const { getByTestId } = renderComp(defaultProps);

    expect(getByTestId('ruleTypeId').textContent).toContain('Log threshold breached');
  });

  it('should display Anomaly title', () => {
    const props: PageTitleProps = {
      alert: {
        ...defaultProps.alert,
        fields: {
          ...defaultProps.alert.fields,
          [ALERT_RULE_CATEGORY]: 'Anomaly',
        },
      },
      alertStatus: defaultProps.alertStatus as AlertStatus,
      dataTestSubj: defaultProps.dataTestSubj,
    };

    const { getByTestId } = renderComp(props);

    expect(getByTestId('ruleTypeId').textContent).toContain('Anomaly detected');
  });

  it('should display Inventory title', () => {
    const props: PageTitleProps = {
      alert: {
        ...defaultProps.alert,
        fields: {
          ...defaultProps.alert.fields,
          [ALERT_RULE_CATEGORY]: 'Inventory',
        },
      },
      alertStatus: defaultProps.alertStatus as AlertStatus,
      dataTestSubj: defaultProps.dataTestSubj,
    };

    const { getByTestId } = renderComp(props);

    expect(getByTestId('ruleTypeId').textContent).toContain('Inventory threshold breached');
  });

  it('should display an active badge when alert is active', async () => {
    const { getByText } = renderComp(defaultProps);
    expect(getByText('Active')).toBeTruthy();
  });

  it('should display a recovered badge when alert is recovered', async () => {
    const updatedProps = {
      alert: {
        ...defaultProps.alert,
        fields: {
          ...defaultProps.alert.fields,
          [ALERT_STATUS]: ALERT_STATUS_RECOVERED,
        },
      },
      alertStatus: ALERT_STATUS_RECOVERED as AlertStatus,
      dataTestSubj: defaultProps.dataTestSubj,
    };

    const { getByText } = renderComp({ ...updatedProps });
    expect(getByText('Recovered')).toBeTruthy();
  });

  it('should display an untracked badge when alert is untracked', async () => {
    const updatedProps = {
      alert: {
        ...defaultProps.alert,
        fields: {
          ...defaultProps.alert.fields,
          [ALERT_STATUS]: ALERT_STATUS_UNTRACKED,
        },
      },
      alertStatus: ALERT_STATUS_UNTRACKED as AlertStatus,
      dataTestSubj: defaultProps.dataTestSubj,
    };

    const { getByText } = renderComp({ ...updatedProps });
    expect(getByText('Untracked')).toBeTruthy();
  });
});
