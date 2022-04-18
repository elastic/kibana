/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { I18nProvider } from '@kbn/i18n-react';
import { ExceptionItemsSummary } from './exception_items_summary';
import * as reactTestingLibrary from '@testing-library/react';
import { getMockTheme } from '../../../../../../../common/lib/kibana/kibana_react.mock';
import { GetExceptionSummaryResponse } from '../../../../../../../../common/endpoint/types';

const mockTheme = getMockTheme({
  eui: {
    paddingSizes: { m: '2' },
  },
});

const getStatValue = (el: reactTestingLibrary.RenderResult, stat: string) => {
  return el.getByText(stat).nextSibling?.lastChild?.textContent;
};

describe('Fleet event filters card', () => {
  const renderComponent: (
    stats: GetExceptionSummaryResponse
  ) => reactTestingLibrary.RenderResult = (stats) => {
    const Wrapper: React.FC = ({ children }) => (
      <I18nProvider>
        <ThemeProvider theme={mockTheme}>{children}</ThemeProvider>
      </I18nProvider>
    );
    const component = reactTestingLibrary.render(<ExceptionItemsSummary stats={stats} />, {
      wrapper: Wrapper,
    });
    return component;
  };
  it('should renders correctly', () => {
    const summary: GetExceptionSummaryResponse = {
      windows: 3,
      linux: 2,
      macos: 2,
      total: 7,
    };
    const component = renderComponent(summary);

    expect(component.getByText('Windows')).not.toBeNull();
    expect(getStatValue(component, 'Windows')).toEqual(summary.windows.toString());

    expect(component.getByText('Linux')).not.toBeNull();
    expect(getStatValue(component, 'Linux')).toEqual(summary.linux.toString());

    expect(component.getByText('Mac')).not.toBeNull();
    expect(getStatValue(component, 'Mac')).toEqual(summary.macos.toString());

    expect(component.getByText('Total')).not.toBeNull();
    expect(getStatValue(component, 'Total')).toEqual(summary.total.toString());
  });
  it('should renders correctly when missing some stats', () => {
    const summary: Partial<GetExceptionSummaryResponse> = {
      windows: 3,
      total: 3,
    };
    const component = renderComponent(summary as GetExceptionSummaryResponse);

    expect(component.getByText('Windows')).not.toBeNull();
    expect(getStatValue(component, 'Windows')).toEqual('3');

    expect(component.getByText('Linux')).not.toBeNull();
    expect(getStatValue(component, 'Linux')).toEqual('0');

    expect(component.getByText('Mac')).not.toBeNull();
    expect(getStatValue(component, 'Mac')).toEqual('0');

    expect(component.getByText('Total')).not.toBeNull();
    expect(getStatValue(component, 'Total')).toEqual('3');
  });
});
