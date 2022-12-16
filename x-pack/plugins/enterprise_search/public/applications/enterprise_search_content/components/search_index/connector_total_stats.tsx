/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiStatProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiStat,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { isConnectorIndex } from '../../utils/indices';

import { languageToText } from '../../utils/language_to_text';

import { ConnectorOverviewPanels } from './connector/connector_overview_panels';
import { NATIVE_CONNECTORS } from './connector/constants';
import { NameAndDescriptionStats } from './name_and_description_stats';
import { OverviewLogic } from './overview.logic';

export const ConnectorTotalStats: React.FC = () => {
  const { indexData, isError, isLoading } = useValues(OverviewLogic);
  const hideStats = isLoading || isError;

  if (!isConnectorIndex(indexData)) {
    return <></>;
  }

  const stats: EuiStatProps[] = [
    {
      description: i18n.translate(
        'xpack.enterpriseSearch.content.searchIndex.totalStats.ingestionTypeCardLabel',
        {
          defaultMessage: 'Ingestion type',
        }
      ),
      isLoading: hideStats,
      title: i18n.translate(
        'xpack.enterpriseSearch.content.searchIndex.totalStats.connectorIngestionMethodLabel',
        {
          defaultMessage: 'Connector',
        }
      ),
    },
    {
      description: i18n.translate('xpack.enterpriseSearch.connector.connectorTypePanel.title', {
        defaultMessage: 'Connector type',
      }),
      title:
        NATIVE_CONNECTORS.find(
          (connector) => connector.serviceType === indexData.connector.service_type
        )?.name ??
        indexData.connector.service_type ??
        i18n.translate('xpack.enterpriseSearch.connector.connectorTypePanel.unknown.label', {
          defaultMessage: 'Unknown',
        }),
    },
    {
      description: i18n.translate(
        'xpack.enterpriseSearch.content.searchIndex.totalStats.languageLabel',
        {
          defaultMessage: 'Language analyzer',
        }
      ),
      isLoading: hideStats,
      title: languageToText(indexData.connector.language ?? ''),
    },
  ];

  return (
    <>
      <NameAndDescriptionStats />
      <EuiSpacer />
      <EuiFlexGroup direction="row">
        {stats.map((item, index) => (
          <EuiFlexItem key={index}>
            <EuiPanel color="primary" hasShadow={false} paddingSize="l">
              <EuiStat {...item} />
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer />
      <ConnectorOverviewPanels />
    </>
  );
};
