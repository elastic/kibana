/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { LeftPanelContext } from '../context';
import { PrevalenceDetails } from './prevalence_details';
import {
  PREVALENCE_DETAILS_LOADING_TEST_ID,
  PREVALENCE_DETAILS_TABLE_ALERT_COUNT_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_DOC_COUNT_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_ERROR_TEST_ID,
  PREVALENCE_DETAILS_TABLE_FIELD_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_HOST_PREVALENCE_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_TEST_ID,
  PREVALENCE_DETAILS_TABLE_USER_PREVALENCE_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_VALUE_CELL_TEST_ID,
} from './test_ids';
import { usePrevalence } from '../../shared/hooks/use_prevalence';
import { TestProviders } from '../../../common/mock';
import { licenseService } from '../../../common/hooks/use_license';

jest.mock('../../shared/hooks/use_prevalence');

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});
jest.mock('../../../common/hooks/use_license', () => {
  const licenseServiceInstance = {
    isPlatinumPlus: jest.fn(),
  };
  return {
    licenseService: licenseServiceInstance,
    useLicense: () => {
      return licenseServiceInstance;
    },
  };
});

const panelContextValue = {
  eventId: 'event id',
  indexName: 'indexName',
  browserFields: {},
  dataFormattedForFieldBrowser: [],
} as unknown as LeftPanelContext;

describe('PrevalenceDetails', () => {
  const licenseServiceMock = licenseService as jest.Mocked<typeof licenseService>;

  it('should render the table with all columns if license is platinum', () => {
    const field1 = 'field1';
    const field2 = 'field2';
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [
        {
          field: field1,
          value: 'value1',
          alertCount: 1,
          docCount: 1,
          hostPrevalence: 0.05,
          userPrevalence: 0.1,
        },
        {
          field: field2,
          value: 'value2',
          alertCount: 1,
          docCount: 1,
          hostPrevalence: 0.5,
          userPrevalence: 0.05,
        },
      ],
    });
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);

    const { getByTestId, getAllByTestId, queryByTestId } = render(
      <TestProviders>
        <LeftPanelContext.Provider value={panelContextValue}>
          <PrevalenceDetails />
        </LeftPanelContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(PREVALENCE_DETAILS_TABLE_TEST_ID)).toBeInTheDocument();
    expect(getAllByTestId(PREVALENCE_DETAILS_TABLE_FIELD_CELL_TEST_ID).length).toBeGreaterThan(1);
    expect(getAllByTestId(PREVALENCE_DETAILS_TABLE_VALUE_CELL_TEST_ID).length).toBeGreaterThan(1);
    expect(
      getAllByTestId(PREVALENCE_DETAILS_TABLE_ALERT_COUNT_CELL_TEST_ID).length
    ).toBeGreaterThan(1);
    expect(getAllByTestId(PREVALENCE_DETAILS_TABLE_DOC_COUNT_CELL_TEST_ID).length).toBeGreaterThan(
      1
    );
    expect(
      getAllByTestId(PREVALENCE_DETAILS_TABLE_HOST_PREVALENCE_CELL_TEST_ID).length
    ).toBeGreaterThan(1);
    expect(
      getAllByTestId(PREVALENCE_DETAILS_TABLE_USER_PREVALENCE_CELL_TEST_ID).length
    ).toBeGreaterThan(1);
    expect(queryByTestId(`${PREVALENCE_DETAILS_TABLE_TEST_ID}UpSell`)).not.toBeInTheDocument();
  });

  it('should render the table with only basic columns if license is not platinum', () => {
    const field1 = 'field1';
    const field2 = 'field2';
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [
        {
          field: field1,
          value: 'value1',
          alertCount: 1,
          docCount: 1,
          hostPrevalence: 0.05,
          userPrevalence: 0.1,
        },
        {
          field: field2,
          value: 'value2',
          alertCount: 1,
          docCount: 1,
          hostPrevalence: 0.5,
          userPrevalence: 0.05,
        },
      ],
    });
    licenseServiceMock.isPlatinumPlus.mockReturnValue(false);

    const { getByTestId, getAllByTestId } = render(
      <TestProviders>
        <LeftPanelContext.Provider value={panelContextValue}>
          <PrevalenceDetails />
        </LeftPanelContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(PREVALENCE_DETAILS_TABLE_TEST_ID)).toBeInTheDocument();
    expect(getAllByTestId(PREVALENCE_DETAILS_TABLE_FIELD_CELL_TEST_ID).length).toBeGreaterThan(1);
    expect(getAllByTestId(PREVALENCE_DETAILS_TABLE_VALUE_CELL_TEST_ID).length).toBeGreaterThan(1);
    expect(
      getAllByTestId(PREVALENCE_DETAILS_TABLE_ALERT_COUNT_CELL_TEST_ID).length
    ).toBeGreaterThan(1);
    expect(getAllByTestId(PREVALENCE_DETAILS_TABLE_DOC_COUNT_CELL_TEST_ID).length).toBeGreaterThan(
      1
    );
    expect(
      getAllByTestId(PREVALENCE_DETAILS_TABLE_HOST_PREVALENCE_CELL_TEST_ID).length
    ).toBeGreaterThan(1);
    expect(
      getAllByTestId(PREVALENCE_DETAILS_TABLE_USER_PREVALENCE_CELL_TEST_ID).length
    ).toBeGreaterThan(1);
    expect(getByTestId(`${PREVALENCE_DETAILS_TABLE_TEST_ID}UpSell`)).toBeInTheDocument();
  });

  it('should render loading', () => {
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: true,
      error: false,
      data: [],
    });
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);

    const { getByTestId } = render(
      <LeftPanelContext.Provider value={panelContextValue}>
        <PrevalenceDetails />
      </LeftPanelContext.Provider>
    );

    expect(getByTestId(PREVALENCE_DETAILS_LOADING_TEST_ID)).toBeInTheDocument();
  });

  it('should render error if call errors out', () => {
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
      data: [],
    });
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);

    const { getByTestId } = render(
      <LeftPanelContext.Provider value={panelContextValue}>
        <PrevalenceDetails />
      </LeftPanelContext.Provider>
    );

    expect(getByTestId(PREVALENCE_DETAILS_TABLE_ERROR_TEST_ID)).toBeInTheDocument();
  });

  it('should render error if event is null', () => {
    const contextValue = {
      ...panelContextValue,
      eventId: null,
    } as unknown as LeftPanelContext;
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
      data: [],
    });
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);

    const { getByTestId } = render(
      <LeftPanelContext.Provider value={contextValue}>
        <PrevalenceDetails />
      </LeftPanelContext.Provider>
    );

    expect(getByTestId(PREVALENCE_DETAILS_TABLE_ERROR_TEST_ID)).toBeInTheDocument();
  });

  it('should render error if dataFormattedForFieldBrowser is null', () => {
    const contextValue = {
      ...panelContextValue,
      dataFormattedForFieldBrowser: null,
    };
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
      data: [],
    });
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);

    const { getByTestId } = render(
      <LeftPanelContext.Provider value={contextValue}>
        <PrevalenceDetails />
      </LeftPanelContext.Provider>
    );

    expect(getByTestId(PREVALENCE_DETAILS_TABLE_ERROR_TEST_ID)).toBeInTheDocument();
  });

  it('should render error if browserFields is null', () => {
    const contextValue = {
      ...panelContextValue,
      browserFields: null,
    };
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
      data: [],
    });
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);

    const { getByTestId } = render(
      <LeftPanelContext.Provider value={contextValue}>
        <PrevalenceDetails />
      </LeftPanelContext.Provider>
    );

    expect(getByTestId(PREVALENCE_DETAILS_TABLE_ERROR_TEST_ID)).toBeInTheDocument();
  });
});
