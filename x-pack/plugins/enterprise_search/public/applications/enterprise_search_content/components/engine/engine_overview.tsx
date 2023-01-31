/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { EngineViewTabs } from '../../routes';
import { EnterpriseSearchEnginesPageTemplate } from '../layout/engines_page_template';

import { EngineViewHeaderActions } from './engine_view_header_actions';
import { EngineViewLogic } from './engine_view_logic';

export const EngineOverview: React.FC = () => {
  const { engineName, engineData, isLoadingEngine } = useValues(EngineViewLogic);

  const indicesCount = engineData?.indices?.length;
  const documentsCount = useMemo(
    () => engineData?.indices?.reduce((sum, { count }) => sum + count, 0),
    [engineData]
  );

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
              <EuiFlexGroup alignItems="center">
                <EuiIcon size="xxl" type="visTable" color="#98A2B3" />
                <EuiStat
                  titleSize="l"
                  isLoading={!engineData}
                  title={`${indicesCount}`}
                  description={i18n.translate(
                    'xpack.enterpriseSearch.content.engine.overview.indicesDescription',
                    { defaultMessage: 'Indices' }
                  )}
                  titleColor="primary"
                />
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center">
                <EuiIcon size="xxl" type="documents" color="#98A2B3" />
                <EuiStat
                  titleSize="l"
                  isLoading={!engineData}
                  title={`${documentsCount}`}
                  description={i18n.translate(
                    'xpack.enterpriseSearch.content.engine.overview.documentsDescription',
                    { defaultMessage: 'Documents' }
                  )}
                  titleColor="primary"
                />
              </EuiFlexGroup>
            </EuiFlexItem>
            {/* <EuiFlexItem>
              <EuiFlexGroup alignItems="center">
                <EuiIcon size="xxl" type="kqlField" color="#98A2B3" />
                <EuiStat
                  titleSize="l"
                  isLoading
                  description={i18n.translate(
                    'xpack.enterpriseSearch.content.engine.overview.fieldsDescription',
                    { defaultMessage: 'Fields' }
                  )}
                  titleColor="primary"
                />
              </EuiFlexGroup>
            </EuiFlexItem> */}
          </EuiFlexGroup>
        </EuiPanel>
      </>
    </EnterpriseSearchEnginesPageTemplate>
  );
};
