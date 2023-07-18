/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Metadata, type MetadataProps } from './metadata';

import { useMetadata } from '../../hooks/use_metadata';
import { useSourceContext } from '../../../../containers/metrics_source';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';

jest.mock('../../../../containers/metrics_source');
jest.mock('../../hooks/use_metadata');

const metadataProps: MetadataProps = {
  dateRange: {
    from: '2023-04-09T11:07:49Z',
    to: '2023-04-09T11:23:49Z',
  },
  nodeType: 'host',
  nodeName: 'host-1',
  showActionsColumn: true,
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

    expect(result.queryByTestId('infraHostMetadataSearchBarInput')).toBeInTheDocument();
    expect(result.queryByTestId('infraHostMetadataNoData')).toBeInTheDocument();
  });

  it('should show the metadata table if metadata is returned', async () => {
    mockUseMetadata({ metadata: [{ name: 'host.os.name', value: 'Ubuntu' }] });
    const result = renderHostMetadata();

    expect(result.queryByTestId('infraHostMetadataSearchBarInput')).toBeInTheDocument();
    expect(result.queryByTestId('infraMetadataTable')).toBeInTheDocument();
  });

  it('should return loading text if loading', async () => {
    mockUseMetadata({ loading: true });
    const result = renderHostMetadata();

    expect(result.queryByTestId('infraHostMetadataSearchBarInput')).toBeInTheDocument();
    expect(result.queryByTestId('infraHostMetadataLoading')).toBeInTheDocument();
  });
});
