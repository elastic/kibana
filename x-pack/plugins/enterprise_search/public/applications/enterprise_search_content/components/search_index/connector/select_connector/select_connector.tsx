/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormFieldset,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { Status } from '../../../../../../../common/types/api';
import { docLinks } from '../../../../../shared/doc_links';
import { generateEncodedPath } from '../../../../../shared/encode_path_params';

import { flashSuccessToast } from '../../../../../shared/flash_messages';
import { KibanaLogic } from '../../../../../shared/kibana';
import { EuiLinkTo } from '../../../../../shared/react_router_helpers';
import { CachedFetchIndexApiLogic } from '../../../../api/index/cached_fetch_index_api_logic';
import { NEW_INDEX_PATH, SEARCH_INDEX_TAB_PATH } from '../../../../routes';
import { isConnectorIndex } from '../../../../utils/indices';
import { EnterpriseSearchContentPageTemplate } from '../../../layout';
import { baseBreadcrumbs } from '../../../search_indices';
import { IndexNameLogic } from '../../index_name_logic';

import { NATIVE_CONNECTORS } from '../constants';

import { ConnectorCheckable } from './connector_checkable';
import { SelectConnectorLogic } from './select_connector_logic';

export const SelectConnector: React.FC = () => {
  const { indexData, status: indexApiStatus } = useValues(CachedFetchIndexApiLogic);
  const { selectedNativeConnector } = useValues(SelectConnectorLogic);
  const { saveNativeConnector, setSelectedConnector } = useActions(SelectConnectorLogic);

  const { indexName } = useValues(IndexNameLogic);

  useEffect(() => {
    if (isConnectorIndex(indexData) && indexData.connector.service_type) {
      flashSuccessToast(
        i18n.translate(
          'xpack.enterpriseSearch.content.indices.selectConnector.successToast.title',
          {
            defaultMessage: 'Your index will now use the {connectorName} native connector.',
            values: {
              connectorName: NATIVE_CONNECTORS.find(
                (connector) => connector.serviceType === indexData.connector.service_type
              )?.name,
            },
          }
        )
      );
      KibanaLogic.values.navigateToUrl(
        generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
          indexName,
          tabId: 'configuration',
        })
      );
    }
  }, [indexData]);

  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[...baseBreadcrumbs, indexName]}
      pageViewTelemetry="select_connector"
      isLoading={
        indexApiStatus === Status.IDLE ||
        (typeof indexData === 'undefined' && indexApiStatus === Status.LOADING)
      }
      pageHeader={{
        pageTitle: indexName,
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          saveNativeConnector();
        }}
      >
        <EuiFormFieldset
          legend={{
            children: (
              <>
                <EuiTitle size="s">
                  <span>
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.selectConnector.title',
                      {
                        defaultMessage: 'Select a connector',
                      }
                    )}
                  </span>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText color="subdued" size="s">
                  <p>
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.selectConnector.description',
                      {
                        defaultMessage:
                          "Get started by selecting the connector you'd like to configure to extract, index and sync data from your data source into your newly created search index.",
                      }
                    )}
                  </p>
                </EuiText>
              </>
            ),
          }}
        >
          <EuiSpacer size="s" />
          <EuiFlexGroup direction="row">
            {NATIVE_CONNECTORS.map((nativeConnector) => (
              <EuiFlexItem>
                <ConnectorCheckable
                  {...nativeConnector}
                  onChange={() => setSelectedConnector(nativeConnector)}
                  documentationUrl={nativeConnector.docsUrl}
                  checked={nativeConnector === selectedNativeConnector}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiSpacer />
          <EuiButton
            data-telemetry-id="entSearchContent-connector-selectConnector-selectAndConfigure"
            fill
            color="primary"
            type="submit"
            disabled={selectedNativeConnector === null}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.selectConnector.selectAndConfigureButtonLabel',
              {
                defaultMessage: 'Select and configure',
              }
            )}
          </EuiButton>
          <EuiSpacer />
          <EuiText size="s">
            <FormattedMessage
              id="xpack.enterpriseSearch.content.indices.selectConnector.moreConnectorsMessage"
              defaultMessage="Looking for more connectors? {workplaceSearchLink} or {buildYourOwnConnectorLink}."
              values={{
                buildYourOwnConnectorLink: (
                  <EuiLinkTo to={`${generateEncodedPath(NEW_INDEX_PATH, {})}?method=connector`}>
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.selectConnector.buildYourOwnConnectorLinkLabel',
                      {
                        defaultMessage: 'build your own',
                      }
                    )}
                  </EuiLinkTo>
                ),
                workplaceSearchLink: (
                  <EuiLink target="_blank" href={docLinks.connectorsWorkplaceSearch}>
                    {i18n.translate(
                      'xpack.enterpriseSearch.content.indices.selectConnector.workplaceSearchLinkLabel',
                      {
                        defaultMessage: 'View additional integrations in Workplace Search',
                      }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        </EuiFormFieldset>
      </form>
    </EnterpriseSearchContentPageTemplate>
  );
};
