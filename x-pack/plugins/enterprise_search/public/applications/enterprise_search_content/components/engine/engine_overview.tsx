/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { generateEncodedPath } from '../../../shared/encode_path_params';
import { EuiLinkTo } from '../../../shared/react_router_helpers';
import { EngineViewTabs, ENGINE_TAB_PATH } from '../../routes';
import { EnterpriseSearchEnginesPageTemplate } from '../layout/engines_page_template';

import { EngineOverviewLogic } from './engine_overview_logic';
import { EngineViewHeaderActions } from './engine_view_header_actions';

export const EngineOverview: React.FC = () => {
  const { engineName, indicesCount, documentsCount, fieldsCount, isLoadingEngine } =
    useValues(EngineOverviewLogic);

  return (
    <EnterpriseSearchEnginesPageTemplate
      pageChrome={[engineName]}
      pageViewTelemetry={EngineViewTabs.OVERVIEW}
      isLoading={isLoadingEngine}
      pageHeader={{
        pageTitle: i18n.translate('xpack.enterpriseSearch.content.engine.overview.pageTitle', {
          defaultMessage: 'Overview',
        }),
        rightSideItems: [<EngineViewHeaderActions />],
      }}
      engineName={engineName}
    >
      <>
        <EuiPanel hasShadow={false} hasBorder paddingSize="l">
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem>
              <EuiLinkTo
                to={generateEncodedPath(ENGINE_TAB_PATH, {
                  engineName,
                  tabId: EngineViewTabs.INDICES,
                })}
                color="text"
              >
                <EuiFlexGroup alignItems="center">
                  <EuiIcon size="xxl" type="visTable" color="#98A2B3" />
                  <EuiStat
                    titleSize="l"
                    isLoading={isLoadingEngine}
                    title={indicesCount.toLocaleString()}
                    description={i18n.translate(
                      'xpack.enterpriseSearch.content.engine.overview.indicesDescription',
                      { defaultMessage: 'Indices' }
                    )}
                    titleColor="primary"
                  />
                </EuiFlexGroup>
              </EuiLinkTo>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center">
                <EuiIcon size="xxl" type="documents" color="#98A2B3" />
                <EuiStat
                  titleSize="l"
                  isLoading={isLoadingEngine}
                  title={documentsCount.toLocaleString()}
                  description={i18n.translate(
                    'xpack.enterpriseSearch.content.engine.overview.documentsDescription',
                    { defaultMessage: 'Documents' }
                  )}
                  titleColor="primary"
                />
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLinkTo
                to={generateEncodedPath(ENGINE_TAB_PATH, {
                  engineName,
                  tabId: EngineViewTabs.SCHEMA,
                })}
                color="text"
              >
                <EuiFlexGroup alignItems="center">
                  <EuiIcon size="xxl" type="documents" color="#98A2B3" />
                  <EuiStat
                    titleSize="l"
                    isLoading={false}
                    title={fieldsCount.toLocaleString()}
                    description={i18n.translate(
                      'xpack.enterpriseSearch.content.engine.overview.fieldsDescription',
                      { defaultMessage: 'Fields' }
                    )}
                    titleColor="primary"
                  />
                </EuiFlexGroup>
              </EuiLinkTo>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </>
    </EnterpriseSearchEnginesPageTemplate>
  );
};
