/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { I18nProvider } from '@kbn/i18n/react';
import { FleetTrustedAppsCard } from './fleet_trusted_apps_card';
import * as reactTestingLibrary from '@testing-library/react';
import { TrustedAppsHttpService } from '../../../../../trusted_apps/service';
import { useToasts } from '../../../../../../../common/lib/kibana';
import { getMockTheme } from '../../../../../../../../public/common/lib/kibana/kibana_react.mock';
import { GetExceptionSummaryResponse } from '../../../../../../../../common/endpoint/types';

jest.mock('./exception_items_summary');
jest.mock('../../../../../trusted_apps/service');

jest.mock('../../../../../../../../../../../src/plugins/kibana_react/public', () => {
  const originalModule = jest.requireActual(
    '../../../../../../../../../../../src/plugins/kibana_react/public'
  );
  const useKibana = jest.fn().mockImplementation(() => ({
    services: {
      http: {},
      data: {},
      notifications: {},
      application: {
        getUrlForApp: jest.fn(),
      },
    },
  }));

  return {
    ...originalModule,
    useKibana,
  };
});

jest.mock('../../../../../../../common/lib/kibana');

const mockTheme = getMockTheme({
  eui: {
    paddingSizes: { m: '2' },
  },
});

const TrustedAppsHttpServiceMock = TrustedAppsHttpService as jest.Mock;
const useToastsMock = useToasts as jest.Mock;

const summary: GetExceptionSummaryResponse = {
  windows: 3,
  linux: 2,
  macos: 2,
  total: 7,
};

describe('Fleet trusted apps card', () => {
  let promise: Promise<GetExceptionSummaryResponse>;
  let addDanger: jest.Mock = jest.fn();
  const renderComponent: () => Promise<reactTestingLibrary.RenderResult> = async () => {
    const Wrapper: React.FC = ({ children }) => (
      <I18nProvider>
        <ThemeProvider theme={mockTheme}>{children}</ThemeProvider>
      </I18nProvider>
    );
    // @ts-ignore
    const component = reactTestingLibrary.render(<FleetTrustedAppsCard />, { wrapper: Wrapper });
    try {
      // @ts-ignore
      await reactTestingLibrary.act(() => promise);
    } catch (err) {
      return component;
    }
    return component;
  };

  beforeAll(() => {
    useToastsMock.mockImplementation(() => {
      return {
        addDanger,
      };
    });
  });
  beforeEach(() => {
    promise = Promise.resolve(summary);
    addDanger = jest.fn();
  });
  afterEach(() => {
    TrustedAppsHttpServiceMock.mockReset();
  });
  it('should render correctly', async () => {
    TrustedAppsHttpServiceMock.mockImplementationOnce(() => {
      return {
        getTrustedAppsSummary: () => jest.fn(() => promise),
      };
    });
    const component = await renderComponent();
    expect(component.getByText('Trusted Applications')).not.toBeNull();
    expect(component.getByText('Manage trusted applications')).not.toBeNull();
  });
  it('should render an error toast when api call fails', async () => {
    expect(addDanger).toBeCalledTimes(0);
    promise = Promise.reject(new Error('error test'));
    TrustedAppsHttpServiceMock.mockImplementationOnce(() => {
      return {
        getTrustedAppsSummary: () => promise,
      };
    });
    const component = await renderComponent();
    expect(component.getByText('Trusted Applications')).not.toBeNull();
    expect(component.getByText('Manage trusted applications')).not.toBeNull();
    await reactTestingLibrary.waitFor(() => expect(addDanger).toBeCalledTimes(1));
  });
});
