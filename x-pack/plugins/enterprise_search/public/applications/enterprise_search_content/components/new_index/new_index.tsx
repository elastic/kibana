/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { INGESTION_METHOD_IDS } from '../../../../../common/constants';

import { ProductFeatures } from '../../../../../common/types';

import { generateEncodedPath } from '../../../shared/encode_path_params';
import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana/kibana_logic';

import { EuiLinkTo } from '../../../shared/react_router_helpers';
import { NEW_INDEX_METHOD_PATH, NEW_INDEX_SELECT_CONNECTOR_PATH } from '../../routes';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';
import { CannotConnect } from '../search_index/components/cannot_connect';
import { baseBreadcrumbs } from '../search_indices';

import { NewIndexCard } from './new_index_card';

const getAvailableMethodOptions = (productFeatures: ProductFeatures): INGESTION_METHOD_IDS[] => {
  return [
    ...(productFeatures.hasWebCrawler ? [INGESTION_METHOD_IDS.CRAWLER] : []),
    ...(productFeatures.hasConnectors ? [INGESTION_METHOD_IDS.CONNECTOR] : []),
    INGESTION_METHOD_IDS.API,
  ];
};

export const NewIndex: React.FC = () => {
  const { capabilities, config, productFeatures } = useValues(KibanaLogic);
  const availableIngestionMethodOptions = getAvailableMethodOptions(productFeatures);
  const { errorConnectingMessage } = useValues(HttpLogic);

  const [selectedMethod, setSelectedMethod] = useState<string>('');
  return (
    <EnterpriseSearchContentPageTemplate
      pageChrome={[
        ...baseBreadcrumbs,
        i18n.translate('xpack.enterpriseSearch.content.newIndex.breadcrumb', {
          defaultMessage: 'New ingestion method',
        }),
      ]}
      pageViewTelemetry="New Index"
      isLoading={false}
      pageHeader={{
        description: i18n.translate('xpack.enterpriseSearch.content.newIndex.pageDescription', {
          defaultMessage:
            'Create a search optimized Elasticsearch index to store your content. Start by selecting an ingestion method.',
        }),
        pageTitle: i18n.translate('xpack.enterpriseSearch.content.newIndex.pageTitle', {
          defaultMessage: 'Select an ingestion method',
        }),
      }}
    >
      <EuiFlexGroup direction="column">
        {errorConnectingMessage && productFeatures.hasWebCrawler && <CannotConnect />}
        <>
          <EuiFlexItem>
            <EuiFlexGroup>
              {availableIngestionMethodOptions.map((type) => (
                <EuiFlexItem key={type}>
                  <NewIndexCard
                    disabled={Boolean(
                      type === INGESTION_METHOD_IDS.CRAWLER &&
                        (errorConnectingMessage || !config.host)
                    )}
                    type={type}
                    onSelect={() => {
                      setSelectedMethod(type);
                      if (type === INGESTION_METHOD_IDS.CONNECTOR) {
                        KibanaLogic.values.navigateToUrl(NEW_INDEX_SELECT_CONNECTOR_PATH);
                      } else {
                        KibanaLogic.values.navigateToUrl(
                          generateEncodedPath(NEW_INDEX_METHOD_PATH, { type })
                        );
                      }
                    }}
                    isSelected={selectedMethod === type}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
          {capabilities.navLinks.integrations && (
            <EuiFlexItem>
              <EuiLinkTo to="/app/integrations" shouldNotCreateHref>
                {i18n.translate('xpack.enterpriseSearch.content.newIndex.viewIntegrationsLink', {
                  defaultMessage: 'View additional integrations',
                })}
              </EuiLinkTo>
            </EuiFlexItem>
          )}
        </>
      </EuiFlexGroup>
    </EnterpriseSearchContentPageTemplate>
  );
};
