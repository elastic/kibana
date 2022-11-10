/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat, EuiStatProps, EuiText } from '@elastic/eui';

import { DESCRIPTION_LABEL, NAME_LABEL } from '../../../shared/constants';
import { generateEncodedPath } from '../../../shared/encode_path_params';
import { EuiLinkTo } from '../../../shared/react_router_helpers';
import { SEARCH_INDEX_TAB_PATH } from '../../routes';
import { isConnectorIndex } from '../../utils/indices';

import { IndexNameLogic } from './index_name_logic';
import { OverviewLogic } from './overview.logic';
import { SearchIndexTabId } from './search_index';

const EditDescription: React.FC<{ label: string; indexName: string }> = ({ label, indexName }) => (
  <EuiFlexGroup justifyContent="spaceBetween">
    <EuiFlexItem grow={false}>{label}</EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiLinkTo
        to={generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
          indexName,
          tabId: SearchIndexTabId.CONFIGURATION,
        })}
      >
        Edit
      </EuiLinkTo>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const NameAndDescriptionStats: React.FC = () => {
  const { indexName } = useValues(IndexNameLogic);
  const { indexData, isError, isLoading } = useValues(OverviewLogic);
  const hideStats = isLoading || isError;

  if (!isConnectorIndex(indexData)) {
    return <></>;
  }

  const stats: EuiStatProps[] = [
    {
      description: <EditDescription label={NAME_LABEL} indexName={indexName} />,
      isLoading: hideStats,
      title: indexData.connector.name,
    },
    {
      description: <EditDescription label={DESCRIPTION_LABEL} indexName={indexName} />,
      isLoading: hideStats,
      title: <EuiText size="s">{indexData.connector.description || ''}</EuiText>,
      titleElement: 'p',
    },
  ];

  return (
    <EuiFlexGroup direction="row">
      {stats.map((item, index) => (
        <EuiFlexItem key={index}>
          <EuiPanel color={'subdued'} hasShadow={false} paddingSize="l">
            <EuiStat {...item} />
          </EuiPanel>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
