/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ThemeProvider } from 'styled-components';
import { I18nProvider } from '@kbn/i18n-react';
import { FleetEventFiltersCard } from './fleet_event_filters_card';
import * as reactTestingLibrary from '@testing-library/react';
import { EventFiltersHttpService } from '../../../../../event_filters/service';
import { useToasts } from '../../../../../../../common/lib/kibana';
import { getMockTheme } from '../../../../../../../../public/common/lib/kibana/kibana_react.mock';
import { GetExceptionSummaryResponse } from '../../../../../../../../common/endpoint/types';

jest.mock('./exception_items_summary');
jest.mock('../../../../../event_filters/service');

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

// Casting to unknown to avoid ts error because there is an static method in the class
const EventFiltersHttpServiceMock = EventFiltersHttpService as unknown as jest.Mock;
const useToastsMock = useToasts as jest.Mock;

const summary: GetExceptionSummaryResponse = {
  windows: 3,
  linux: 2,
  macos: 2,
  total: 7,
};

describe('Fleet event filters card', () => {
  let promise: Promise<GetExceptionSummaryResponse>;
  let addDanger: jest.Mock = jest.fn();
  const renderComponent: () => Promise<reactTestingLibrary.RenderResult> = async () => {
    const Wrapper: React.FC = ({ children }) => (
      <I18nProvider>
        <ThemeProvider theme={mockTheme}>{children}</ThemeProvider>
      </I18nProvider>
    );
    // @ts-expect-error TS2739
    const component = reactTestingLibrary.render(<FleetEventFiltersCard />, { wrapper: Wrapper });
    try {
      // @ts-expect-error TS2769
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
    EventFiltersHttpServiceMock.mockReset();
  });
  it('should render correctly', async () => {
    EventFiltersHttpServiceMock.mockImplementationOnce(() => {
      return {
        getSummary: () => jest.fn(() => promise),
      };
    });
    const component = await renderComponent();
    expect(component.getByText('Event filters')).not.toBeNull();
    expect(component.getByText('Manage')).not.toBeNull();
  });
  it('should render an error toast when api call fails', async () => {
    expect(addDanger).toBeCalledTimes(0);
    promise = Promise.reject(new Error('error test'));
    EventFiltersHttpServiceMock.mockImplementationOnce(() => {
      return {
        getSummary: () => promise,
      };
    });
    const component = await renderComponent();
    expect(component.getByText('Event filters')).not.toBeNull();
    expect(component.getByText('Manage')).not.toBeNull();
    await reactTestingLibrary.waitFor(() => expect(addDanger).toBeCalledTimes(1));
  });
});
