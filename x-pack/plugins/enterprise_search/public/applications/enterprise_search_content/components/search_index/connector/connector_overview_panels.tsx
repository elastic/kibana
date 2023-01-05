/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStat } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { generateEncodedPath } from '../../../../shared/encode_path_params';

import { EuiLinkTo } from '../../../../shared/react_router_helpers';

import { SEARCH_INDEX_TAB_PATH } from '../../../routes';
import { IngestionStatus } from '../../../types';
import { isConnectorIndex } from '../../../utils/indices';

import {
  ingestionStatusToColor,
  ingestionStatusToText,
} from '../../../utils/ingestion_status_helpers';
import { IndexViewLogic } from '../index_view_logic';
import { SearchIndexTabId } from '../search_index';

const StatusPanel: React.FC<{ ingestionStatus: IngestionStatus }> = ({ ingestionStatus }) => (
  <EuiPanel color={ingestionStatusToColor(ingestionStatus)} hasShadow={false} paddingSize="l">
    <EuiStat
      description={i18n.translate('xpack.enterpriseSearch.connector.ingestionStatus.title', {
        defaultMessage: 'Ingestion status',
      })}
      title={ingestionStatusToText(ingestionStatus)}
    />
  </EuiPanel>
);

export const ConnectorOverviewPanels: React.FC = () => {
  const { ingestionStatus, index } = useValues(IndexViewLogic);

  return isConnectorIndex(index) ? (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <EuiPanel color="primary" hasShadow={false} paddingSize="l">
          <EuiStat
            description={i18n.translate(
              'xpack.enterpriseSearch.content.searchIndex.totalStats.documentCountCardLabel',
              {
                defaultMessage: 'Document count',
              }
            )}
            title={index.count}
          />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={1}>
        {ingestionStatus === IngestionStatus.INCOMPLETE ? (
          <EuiLinkTo
            to={generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
              indexName: index.name,
              tabId: SearchIndexTabId.CONFIGURATION,
            })}
          >
            <StatusPanel ingestionStatus={ingestionStatus} />
          </EuiLinkTo>
        ) : (
          <StatusPanel ingestionStatus={ingestionStatus} />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <></>
  );
};
