/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Metadata, TabProps } from './metadata';

import { useMetadata } from '../../../../metric_detail/hooks/use_metadata';
import { useSourceContext } from '../../../../../../containers/metrics_source';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';

jest.mock('../../../../../../containers/metrics_source');
jest.mock('../../../../metric_detail/hooks/use_metadata');

const metadataProps: TabProps = {
  currentTimeRange: {
    from: 1679316685686,
    to: 1679585836087,
    interval: '1m',
  },
  node: {
    uuid: 'b9c06da0-b9b0-4c7e-830c-05128cb34396',
    name: 'host-1',
    os: 'iOS',
    title: {
      name: 'host-1',
      cloudProvider: 'gcp',
    },
    rx: {
      name: 'rx',
      value: 0,
      max: 0,
      avg: 0,
    },
    tx: {
      name: 'tx',
      value: 0,
      max: 0,
      avg: 0,
    },
    memory: {
      name: 'memory',
      value: 0.5445920331099282,
      max: 0.5445920331099282,
      avg: 0.5445920331099282,
    },
    cpu: {
      name: 'cpu',
      value: 0.2000718443867342,
      max: 0.2000718443867342,
      avg: 0.2000718443867342,
    },
    diskLatency: {
      name: 'diskLatency',
      value: null,
      max: 0,
      avg: 0,
    },
    memoryTotal: {
      name: 'memoryTotal',
      value: 16777216,
      max: 16777216,
      avg: 16777216,
    },
  },
};

const renderHostMetadata = () =>
  render(
    <I18nProvider>
      <Metadata {...metadataProps} />
    </I18nProvider>,
    { wrapper: EuiThemeProvider }
  );

describe('Single Host Metadata (Hosts View)', () => {
  const mockUseMetadata = (props: any = {}) => {
    const data = {
      ...props.data,
    };
    (useMetadata as jest.Mock).mockReturnValue({
      ...props,
      data,
    });
  };

  beforeAll(() => {
    (useSourceContext as jest.Mock).mockReturnValue({ sourceId: '123' });
    mockUseMetadata();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show an error if fetching the metadata returns error', async () => {
    mockUseMetadata({ error: 'Internal server error' });
    const result = renderHostMetadata();

    expect(result.queryByTestId('infraMetadataErrorCallout')).toBeInTheDocument();
  });

  it('should show an no data message if fetching the metadata returns an empty array', async () => {
    mockUseMetadata({ metadata: [] });
    const result = renderHostMetadata();

    expect(result.queryByTestId('infraMetadataNoData')).toBeInTheDocument();
  });

  it('should return spinner if loading', async () => {
    mockUseMetadata({ loading: true });
    const result = renderHostMetadata();

    expect(result.queryByTestId('infraHostMetadataLoading')).toBeInTheDocument();
  });
});
