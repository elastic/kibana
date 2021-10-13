/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/dom';
import { render } from './rtl_helpers';
import * as kibanaSettings from '../../../hooks/use_kibana_ui_settings';
import { ChartCreationInfo } from './chart_creation_info';

jest.spyOn(kibanaSettings, 'useKibanaUISettings').mockReturnValue('MMM D, YYYY @ HH:mm:ss.SSS');

const info = {
  to: 1634071132571,
  from: 1633406400000,
  lastUpdated: 1634071140788,
};

describe('ChartCreationInfo', () => {
  it('renders chart creation info', async () => {
    render(<ChartCreationInfo {...info} />);

    expect(screen.getByText('Chart created on Oct 12, 2021 @ 16:39:00.788')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Displaying data from Oct 5, 2021 @ 00:00:00.000 to Oct 12, 2021 @ 16:38:52.571'
      )
    ).toBeInTheDocument();
  });

  it('does not display info when props are falsey', async () => {
    render(<ChartCreationInfo />);

    expect(
      screen.queryByText('Chart created on Oct 12, 2021 @ 16:39:00.788')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        'Displaying data from Oct 5, 2021 @ 00:00:00.000 to Oct 12, 2021 @ 16:38:52.571'
      )
    ).not.toBeInTheDocument();
  });
});
