/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
} from '@elastic/eui';
import { SearchRequest, SearchResponse } from '@elastic/search-ui-engines-connector';
import { FormattedMessage } from '@kbn/i18n-react';

import { generateEncodedPath } from '../../../../shared/encode_path_params';
import { EuiLinkTo } from '../../../../shared/react_router_helpers';

import { SearchApplicationViewTabs, SEARCH_APPLICATION_TAB_PATH } from '../../../routes';

export interface APICallData {
  request: SearchRequest;
  response: SearchResponse;
}

export interface APICallFlyoutProps {
  lastAPICall: APICallData;
  onClose: () => void;
  searchApplicationName: string;
}

export const APICallFlyout: React.FC<APICallFlyoutProps> = ({
  onClose,
  lastAPICall,
  searchApplicationName,
}) => {
  const [tab, setTab] = useState<'request' | 'response'>('request');

  const contents = JSON.stringify(lastAPICall[tab], null, 2);

  return (
    <EuiFlyout onClose={onClose} size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.apiCallFlyout.title"
              defaultMessage="API Call"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          style={{ marginBottom: '-24px' }}
        >
          <EuiTabs bottomBorder={false}>
            <EuiTab isSelected={tab === 'request'} onClick={() => setTab('request')}>
              <FormattedMessage
                id="xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.apiCallFlyout.requestTab"
                defaultMessage="Request"
              />
            </EuiTab>
            <EuiTab isSelected={tab === 'response'} onClick={() => setTab('response')}>
              <FormattedMessage
                id="xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.apiCallFlyout.responseTab"
                defaultMessage="Response"
              />
            </EuiTab>
          </EuiTabs>
          <EuiLinkTo
            to={generateEncodedPath(SEARCH_APPLICATION_TAB_PATH, {
              searchApplicationName,
              tabId: SearchApplicationViewTabs.CONNECT,
            })}
            color="primary"
            target="_blank"
          >
            <FormattedMessage
              id="xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.apiCallFlyout.searchEndpointLink"
              defaultMessage="Search endpoint"
            />
          </EuiLinkTo>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <div style={{ blockSize: '100%' }}>
        <EuiCodeBlock overflowHeight="100%" isCopyable isVirtualized>
          {contents}
        </EuiCodeBlock>
      </div>
    </EuiFlyout>
  );
};
