/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../../../lib/helper/rtl_helpers';
import {
  WaterfallFlyout,
  DETAILS,
  CERTIFICATES,
  REQUEST_HEADERS,
  RESPONSE_HEADERS,
} from './waterfall_flyout';
import { WaterfallMetadataEntry } from '../../waterfall/types';

describe('WaterfallFlyout', () => {
  const flyoutData: WaterfallMetadataEntry = {
    x: 0,
    url: 'http://elastic.co',
    requestHeaders: undefined,
    responseHeaders: undefined,
    certificates: undefined,
    details: [
      {
        name: 'Content type',
        value: 'text/html',
      },
    ],
  };

  const defaultProps = {
    flyoutData,
    isFlyoutVisible: true,
    onFlyoutClose: () => null,
  };

  it('displays flyout information and omits sections that are undefined', () => {
    const { getByText, queryByText } = render(<WaterfallFlyout {...defaultProps} />);

    expect(getByText(flyoutData.url)).toBeInTheDocument();
    expect(queryByText(DETAILS)).toBeInTheDocument();
    flyoutData.details.forEach((detail) => {
      expect(getByText(detail.name)).toBeInTheDocument();
      expect(getByText(`${detail.value}`)).toBeInTheDocument();
    });

    expect(queryByText(CERTIFICATES)).not.toBeInTheDocument();
    expect(queryByText(REQUEST_HEADERS)).not.toBeInTheDocument();
    expect(queryByText(RESPONSE_HEADERS)).not.toBeInTheDocument();
  });

  it('displays flyout certificates information', () => {
    const certificates = [
      {
        name: 'Issuer',
        value: 'Sample Issuer',
      },
      {
        name: 'Valid From',
        value: 'January 1, 2020 7:00PM',
      },
      {
        name: 'Valid Until',
        value: 'January 31, 2020 7:00PM',
      },
      {
        name: 'Common Name',
        value: '*.elastic.co',
      },
    ];
    const flyoutDataWithCertificates = {
      ...flyoutData,
      certificates,
    };

    const { getByText } = render(
      <WaterfallFlyout {...defaultProps} flyoutData={flyoutDataWithCertificates} />
    );

    expect(getByText(flyoutData.url)).toBeInTheDocument();
    expect(getByText(DETAILS)).toBeInTheDocument();
    expect(getByText(CERTIFICATES)).toBeInTheDocument();
    flyoutData.certificates?.forEach((detail) => {
      expect(getByText(detail.name)).toBeInTheDocument();
      expect(getByText(`${detail.value}`)).toBeInTheDocument();
    });
  });

  it('displays flyout request and response headers information', () => {
    const requestHeaders = [
      {
        name: 'sample_request_header',
        value: 'Sample Request Header value',
      },
    ];
    const responseHeaders = [
      {
        name: 'sample_response_header',
        value: 'sample response header value',
      },
    ];
    const flyoutDataWithHeaders = {
      ...flyoutData,
      requestHeaders,
      responseHeaders,
    };
    const { getByText } = render(
      <WaterfallFlyout {...defaultProps} flyoutData={flyoutDataWithHeaders} />
    );

    expect(getByText(flyoutData.url)).toBeInTheDocument();
    expect(getByText(DETAILS)).toBeInTheDocument();
    expect(getByText(REQUEST_HEADERS)).toBeInTheDocument();
    expect(getByText(RESPONSE_HEADERS)).toBeInTheDocument();
    flyoutData.requestHeaders?.forEach((detail) => {
      expect(getByText(detail.name)).toBeInTheDocument();
      expect(getByText(`${detail.value}`)).toBeInTheDocument();
    });
    flyoutData.responseHeaders?.forEach((detail) => {
      expect(getByText(detail.name)).toBeInTheDocument();
      expect(getByText(`${detail.value}`)).toBeInTheDocument();
    });
  });

  it('renders null when isFlyoutVisible is false', () => {
    const { queryByText } = render(<WaterfallFlyout {...defaultProps} isFlyoutVisible={false} />);

    expect(queryByText(flyoutData.url)).not.toBeInTheDocument();
  });

  it('renders null when flyoutData is undefined', () => {
    const { queryByText } = render(<WaterfallFlyout {...defaultProps} flyoutData={undefined} />);

    expect(queryByText(flyoutData.url)).not.toBeInTheDocument();
  });
});
