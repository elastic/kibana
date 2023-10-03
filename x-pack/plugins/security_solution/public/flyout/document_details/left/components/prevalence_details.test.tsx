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
  PREVALENCE_DETAILS_TABLE_ALERT_COUNT_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_DOC_COUNT_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_FIELD_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_HOST_PREVALENCE_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_TEST_ID,
  PREVALENCE_DETAILS_UPSELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_USER_PREVALENCE_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_VALUE_CELL_TEST_ID,
  PREVALENCE_DETAILS_TABLE_UPSELL_CELL_TEST_ID,
} from './test_ids';
import { usePrevalence } from '../../shared/hooks/use_prevalence';
import { TestProviders } from '../../../../common/mock';
import { licenseService } from '../../../../common/hooks/use_license';

jest.mock('../../shared/hooks/use_prevalence');

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});
jest.mock('../../../../common/hooks/use_license', () => {
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

const NO_DATA_MESSAGE = 'No prevalence data available.';

const panelContextValue = {
  eventId: 'event id',
  indexName: 'indexName',
  browserFields: {},
  dataFormattedForFieldBrowser: [],
} as unknown as LeftPanelContext;

const UPSELL_MESSAGE = 'Host and user prevalence are only available with a';

const renderPrevalenceDetails = () =>
  render(
    <TestProviders>
      <LeftPanelContext.Provider value={panelContextValue}>
        <PrevalenceDetails />
      </LeftPanelContext.Provider>
    </TestProviders>
  );

describe('PrevalenceDetails', () => {
  const licenseServiceMock = licenseService as jest.Mocked<typeof licenseService>;

  beforeEach(() => {
    licenseServiceMock.isPlatinumPlus.mockReturnValue(true);
  });

  it('should render the table with all data if license is platinum', () => {
    const field1 = 'field1';
    const field2 = 'field2';
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [
        {
          field: field1,
          values: ['value1'],
          alertCount: 1,
          docCount: 1,
          hostPrevalence: 0.05,
          userPrevalence: 0.1,
        },
        {
          field: field2,
          values: ['value2'],
          alertCount: 1,
          docCount: 1,
          hostPrevalence: 0.5,
          userPrevalence: 0.05,
        },
      ],
    });

    const { getByTestId, getAllByTestId, queryByTestId, queryByText } = renderPrevalenceDetails();

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
    expect(queryByTestId(PREVALENCE_DETAILS_UPSELL_TEST_ID)).not.toBeInTheDocument();
    expect(queryByText(NO_DATA_MESSAGE)).not.toBeInTheDocument();
  });

  it('should hide data in prevalence columns if license is not platinum', () => {
    const field1 = 'field1';

    licenseServiceMock.isPlatinumPlus.mockReturnValue(false);
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [
        {
          field: field1,
          values: ['value1'],
          alertCount: 1,
          docCount: 1,
          hostPrevalence: 0.05,
          userPrevalence: 0.1,
        },
      ],
    });

    const { getByTestId, getAllByTestId } = renderPrevalenceDetails();

    expect(getByTestId(PREVALENCE_DETAILS_TABLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(PREVALENCE_DETAILS_UPSELL_TEST_ID)).toHaveTextContent(UPSELL_MESSAGE);
    expect(getAllByTestId(PREVALENCE_DETAILS_TABLE_UPSELL_CELL_TEST_ID).length).toEqual(2);
    expect(
      getByTestId(PREVALENCE_DETAILS_TABLE_HOST_PREVALENCE_CELL_TEST_ID)
    ).not.toHaveTextContent('5%');
    expect(
      getByTestId(PREVALENCE_DETAILS_TABLE_USER_PREVALENCE_CELL_TEST_ID)
    ).not.toHaveTextContent('10%');
  });

  it('should render formatted numbers for the alert and document count columns', () => {
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [
        {
          field: 'field1',
          values: ['value1'],
          alertCount: 1000,
          docCount: 2000000,
          hostPrevalence: 0.05,
          userPrevalence: 0.1,
        },
      ],
    });

    const { getByTestId } = render(
      <TestProviders>
        <LeftPanelContext.Provider value={panelContextValue}>
          <PrevalenceDetails />
        </LeftPanelContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(PREVALENCE_DETAILS_TABLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(PREVALENCE_DETAILS_TABLE_FIELD_CELL_TEST_ID)).toHaveTextContent('field1');
    expect(getByTestId(PREVALENCE_DETAILS_TABLE_VALUE_CELL_TEST_ID)).toHaveTextContent('value1');
    expect(getByTestId(PREVALENCE_DETAILS_TABLE_ALERT_COUNT_CELL_TEST_ID)).toHaveTextContent('1k');
    expect(getByTestId(PREVALENCE_DETAILS_TABLE_DOC_COUNT_CELL_TEST_ID)).toHaveTextContent('2M');
    expect(getByTestId(PREVALENCE_DETAILS_TABLE_HOST_PREVALENCE_CELL_TEST_ID)).toHaveTextContent(
      '5%'
    );
    expect(getByTestId(PREVALENCE_DETAILS_TABLE_USER_PREVALENCE_CELL_TEST_ID)).toHaveTextContent(
      '10%'
    );
  });

  it('should render multiple values in value column', () => {
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [
        {
          field: 'field1',
          values: ['value1', 'value2'],
          alertCount: 1000,
          docCount: 2000000,
          hostPrevalence: 0.05,
          userPrevalence: 0.1,
        },
      ],
    });

    const { getByTestId } = render(
      <TestProviders>
        <LeftPanelContext.Provider value={panelContextValue}>
          <PrevalenceDetails />
        </LeftPanelContext.Provider>
      </TestProviders>
    );

    expect(getByTestId(PREVALENCE_DETAILS_TABLE_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(PREVALENCE_DETAILS_TABLE_VALUE_CELL_TEST_ID)).toHaveTextContent('value1');
    expect(getByTestId(PREVALENCE_DETAILS_TABLE_VALUE_CELL_TEST_ID)).toHaveTextContent('value2');
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
          values: ['value1'],
          alertCount: 1,
          docCount: 1,
          hostPrevalence: 0.05,
          userPrevalence: 0.1,
        },
        {
          field: field2,
          values: ['value2'],
          alertCount: 1,
          docCount: 1,
          hostPrevalence: 0.5,
          userPrevalence: 0.05,
        },
      ],
    });
    licenseServiceMock.isPlatinumPlus.mockReturnValue(false);

    const { getByTestId, getAllByTestId } = renderPrevalenceDetails();

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
    expect(getByTestId(PREVALENCE_DETAILS_UPSELL_TEST_ID)).toBeInTheDocument();
  });

  it('should render no data message if call errors out', () => {
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
      data: [],
    });

    const { getByText } = renderPrevalenceDetails();
    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
  });

  it('should render no data message if no data', () => {
    (usePrevalence as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      data: [],
    });

    const { getByText } = renderPrevalenceDetails();
    expect(getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
  });
});
