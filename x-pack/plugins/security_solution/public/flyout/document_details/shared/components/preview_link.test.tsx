/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { FLYOUT_PREVIEW_LINK_TEST_ID } from './test_ids';
import { PreviewLink } from './preview_link';
import { DocumentDetailsContext } from '../context';
import { TestProviders } from '../../../../common/mock';
import { mockFlyoutApi } from '../mocks/mock_flyout_context';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { HostPreviewPanelKey } from '../../../entity_details/host_right';
import { HOST_PREVIEW_BANNER } from '../../right/components/host_entity_overview';
import { UserPreviewPanelKey } from '../../../entity_details/user_right';
import { USER_PREVIEW_BANNER } from '../../right/components/user_entity_overview';
import { NetworkPanelKey, NETWORK_PREVIEW_BANNER } from '../../../network_details';

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(),
  ExpandableFlyoutProvider: ({ children }: React.PropsWithChildren<{}>) => <>{children}</>,
}));

const panelContextValue = {
  eventId: 'event id',
  indexName: 'indexName',
  scopeId: 'scopeId',
} as unknown as DocumentDetailsContext;

const renderPreviewLink = (field: string, value: string, dataTestSuj?: string) =>
  render(
    <TestProviders>
      <DocumentDetailsContext.Provider value={panelContextValue}>
        <PreviewLink field={field} value={value} data-test-subj={dataTestSuj} />
      </DocumentDetailsContext.Provider>
    </TestProviders>
  );

describe('<PreviewLink />', () => {
  beforeAll(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue(mockFlyoutApi);
  });

  it('should not render a link if field does not have preview', () => {
    const { queryByTestId } = renderPreviewLink('field', 'value');
    expect(queryByTestId(FLYOUT_PREVIEW_LINK_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render children without link if field does not have preview', () => {
    const { queryByTestId, getByTestId } = render(
      <TestProviders>
        <DocumentDetailsContext.Provider value={panelContextValue}>
          <PreviewLink field={'field'} value={'value'}>
            <div data-test-subj="children">{'children'}</div>
          </PreviewLink>
        </DocumentDetailsContext.Provider>
      </TestProviders>
    );

    expect(queryByTestId(FLYOUT_PREVIEW_LINK_TEST_ID)).not.toBeInTheDocument();
    expect(getByTestId('children')).toBeInTheDocument();
  });

  it('should render a link to open host preview', () => {
    const { getByTestId } = renderPreviewLink('host.name', 'host', 'host-link');
    getByTestId('host-link').click();

    expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
      id: HostPreviewPanelKey,
      params: {
        hostName: 'host',
        scopeId: panelContextValue.scopeId,
        banner: HOST_PREVIEW_BANNER,
      },
    });
  });

  it('should render a link to open user preview', () => {
    const { getByTestId } = renderPreviewLink('user.name', 'user', 'user-link');
    getByTestId('user-link').click();

    expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
      id: UserPreviewPanelKey,
      params: {
        userName: 'user',
        scopeId: panelContextValue.scopeId,
        banner: USER_PREVIEW_BANNER,
      },
    });
  });

  it('should render a link to open network preview', () => {
    const { getByTestId } = renderPreviewLink('source.ip', '100:XXX:XXX', 'ip-link');
    getByTestId('ip-link').click();

    expect(mockFlyoutApi.openPreviewPanel).toHaveBeenCalledWith({
      id: NetworkPanelKey,
      params: {
        ip: '100:XXX:XXX',
        flowTarget: 'source',
        banner: NETWORK_PREVIEW_BANNER,
      },
    });
  });
});
