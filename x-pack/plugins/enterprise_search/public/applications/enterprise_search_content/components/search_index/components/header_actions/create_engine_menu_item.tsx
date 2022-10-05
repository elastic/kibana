/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiContextMenuItem, EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { APP_SEARCH_PLUGIN } from '../../../../../../../common/constants';
import { ENGINE_CREATION_PATH } from '../../../../../app_search/routes';
import { ESINDEX_QUERY_PARAMETER } from '../../../../../shared/constants';
import { generateEncodedPath } from '../../../../../shared/encode_path_params';
import { KibanaLogic } from '../../../../../shared/kibana';

export interface CreateEngineMenuItemProps {
  indexName?: string;
  isHiddenIndex?: boolean;
}

export const CreateEngineMenuItem: React.FC<CreateEngineMenuItemProps> = ({
  indexName,
  isHiddenIndex,
}) => {
  const engineCreationPath = !indexName
    ? `${APP_SEARCH_PLUGIN.URL}${ENGINE_CREATION_PATH}`
    : generateEncodedPath(`${APP_SEARCH_PLUGIN.URL}${ENGINE_CREATION_PATH}?:indexKey=:indexName`, {
        indexKey: ESINDEX_QUERY_PARAMETER,
        indexName,
      });

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs">
      <EuiFlexItem>
        <EuiContextMenuItem
          size="s"
          icon="plusInCircle"
          onClick={() => {
            KibanaLogic.values.navigateToUrl(engineCreationPath, {
              shouldNotCreateHref: true,
            });
          }}
          disabled={isHiddenIndex}
        >
          <EuiText>
            <p>
              {i18n.translate('xpack.enterpriseSearch.content.index.searchEngines.createEngine', {
                defaultMessage: 'Create an App Search engine',
              })}
            </p>
          </EuiText>
        </EuiContextMenuItem>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
