/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { useLocation } from 'react-router-dom';

import { useValues } from 'kea';

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { INGESTION_METHOD_IDS } from '../../../../../common/constants';

import { ProductFeatures } from '../../../../../common/types';

import { CONTINUE_BUTTON_LABEL } from '../../../shared/constants';

import { generateEncodedPath } from '../../../shared/encode_path_params';
import { KibanaLogic } from '../../../shared/kibana/kibana_logic';

import { parseQueryParams } from '../../../shared/query_params';
import { EuiLinkTo } from '../../../shared/react_router_helpers';
import { NEW_INDEX_METHOD_PATH, NEW_INDEX_SELECT_CONNECTOR_PATH } from '../../routes';
import { EnterpriseSearchContentPageTemplate } from '../layout/page_template';
import { baseBreadcrumbs } from '../search_indices';

import { NewIndexCard } from './new_index_card';

const getAvailableMethodOptions = (productFeatures: ProductFeatures): INGESTION_METHOD_IDS[] => {
  return [
    ...(productFeatures.hasWebCrawler ? [INGESTION_METHOD_IDS.CRAWLER] : []),
    INGESTION_METHOD_IDS.API,
    ...(productFeatures.hasConnectors ? [INGESTION_METHOD_IDS.CONNECTOR] : []),
  ];
};

export const NewIndex: React.FC = () => {
  const { search } = useLocation();
  const { method } = parseQueryParams(search);
  const { capabilities, productFeatures } = useValues(KibanaLogic);
  const availableIngestionMethodOptions = getAvailableMethodOptions(productFeatures);

  const [selectedMethod, setSelectedMethod] = useState<string>(
    Array.isArray(method) ? method[0] : method ?? INGESTION_METHOD_IDS.CRAWLER
  );
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
            'Create a search optimized Elasticsearch index by selecting an ingestion method',
        }),
        pageTitle: i18n.translate('xpack.enterpriseSearch.content.newIndex.pageTitle', {
          defaultMessage: 'Select an ingestion method',
        }),
      }}
    >
      <EuiFlexGroup direction="column">
        <>
          <EuiFlexItem>
            <EuiFlexGroup>
              {availableIngestionMethodOptions.map((type) => (
                <EuiFlexItem key={type}>
                  <NewIndexCard
                    type={type}
                    onSelect={() => {
                      setSelectedMethod(type);
                    }}
                    isSelected={selectedMethod === type}
                  />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem>
                {capabilities.navLinks.integrations && (
                  <>
                    <EuiLinkTo to="/app/integrations" shouldNotCreateHref>
                      {i18n.translate(
                        'xpack.enterpriseSearch.content.newIndex.viewIntegrationsLink',
                        {
                          defaultMessage: 'View additional integrations',
                        }
                      )}
                    </EuiLinkTo>
                  </>
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="entSearchContent-newIndexPage-continueButton"
                  color="primary"
                  disabled={
                    !Object.values(INGESTION_METHOD_IDS as Record<string, string>).includes(
                      selectedMethod
                    )
                  }
                  fill
                  onClick={() => {
                    if (selectedMethod === INGESTION_METHOD_IDS.CONNECTOR) {
                      KibanaLogic.values.navigateToUrl(NEW_INDEX_SELECT_CONNECTOR_PATH);
                    } else {
                      KibanaLogic.values.navigateToUrl(
                        generateEncodedPath(NEW_INDEX_METHOD_PATH, { type: selectedMethod })
                      );
                    }
                  }}
                >
                  {CONTINUE_BUTTON_LABEL}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </>
      </EuiFlexGroup>
    </EnterpriseSearchContentPageTemplate>
  );
};
