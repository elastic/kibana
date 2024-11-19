/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { generateEncodedPath } from '../../../../../shared/encode_path_params';
import { EuiButtonTo } from '../../../../../shared/react_router_helpers';

import { SEARCH_INDEX_TAB_PATH } from '../../../../routes';
import { SyncsContextMenu } from '../../../shared/header_actions/syncs_context_menu';
import { IndexNameLogic } from '../../index_name_logic';
import { SearchIndexTabId } from '../../search_index';

export const NativeConnectorAdvancedConfiguration: React.FC = () => {
  const { indexName } = useValues(IndexNameLogic);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiText size="s">
          <FormattedMessage
            id="xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnectorAdvancedConfiguration.description"
            defaultMessage="Finalize your connector by triggering a one time sync, or setting a recurring sync schedule."
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButtonTo
              data-test-subj="entSearchContent-connector-configuration-setScheduleAndSync"
              data-telemetry-id="entSearchContent-connector-configuration-setScheduleAndSync"
              to={`${generateEncodedPath(SEARCH_INDEX_TAB_PATH, {
                indexName,
                tabId: SearchIndexTabId.SCHEDULING,
              })}`}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.configurationConnector.nativeConnectorAdvancedConfiguration.schedulingButtonLabel',
                {
                  defaultMessage: 'Set schedule and sync',
                }
              )}
            </EuiButtonTo>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SyncsContextMenu />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
