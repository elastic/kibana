/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ALERT_RULE_CATEGORY } from '@kbn/rule-data-utils';
import { PageTitle, PageTitleProps } from './page_title';
import { alert } from '../mock/alert';

describe('Page Title', () => {
  const defaultProps = {
    alert,
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

    expect(getByTestId('page-title-container').textContent).toContain('Log threshold breached');
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
    };

    const { getByTestId } = renderComp(props);

    expect(getByTestId('page-title-container').textContent).toContain('Anomaly detected');
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
    };

    const { getByTestId } = renderComp(props);

    expect(getByTestId('page-title-container').textContent).toContain(
      'Inventory threshold breached'
    );
  });

  it('should display an active badge when active is true', async () => {
    const { getByText } = renderComp(defaultProps);
    expect(getByText('Active')).toBeTruthy();
  });

  it('should display an inactive badge when active is false', async () => {
    const updatedProps = { alert };
    updatedProps.alert.active = false;

    const { getByText } = renderComp({ ...updatedProps });
    expect(getByText('Recovered')).toBeTruthy();
  });
});
