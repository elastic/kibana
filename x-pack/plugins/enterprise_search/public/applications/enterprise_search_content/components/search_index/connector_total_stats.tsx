/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

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

import { KibanaLogic } from '../../../shared/kibana';
import { isConnectorIndex } from '../../utils/indices';

import { languageToText } from '../../utils/language_to_text';

import { ConnectorOverviewPanels } from './connector/connector_overview_panels';
import { NameAndDescriptionStats } from './name_and_description_stats';
import { OverviewLogic } from './overview.logic';

export const ConnectorTotalStats: React.FC = () => {
  const { indexData, isError, isLoading } = useValues(OverviewLogic);
  const { connectorTypes } = useValues(KibanaLogic);
  const hideStats = isLoading || isError;
  const NATIVE_CONNECTORS = useMemo(
    () => connectorTypes.filter(({ isNative }) => isNative),
    [connectorTypes]
  );

  if (!isConnectorIndex(indexData)) {
    return <></>;
  }

  const stats: EuiStatProps[] & { 'data-test-subj'?: string } = [
    {
      // @ts-expect-error upgrade typescript v4.9.5
      'data-test-subj': 'entSearchContent-indexOverview-totalStats-ingestionType',
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
      // @ts-expect-error upgrade typescript v4.9.5
      'data-test-subj': 'entSearchContent-indexOverview-totalStats-connectorType',
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
              <EuiStat titleSize="s" {...item} />
            </EuiPanel>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer />
      <ConnectorOverviewPanels />
    </>
  );
};
