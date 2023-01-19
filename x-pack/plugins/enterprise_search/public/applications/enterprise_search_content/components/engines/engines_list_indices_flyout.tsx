/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { EnterpriseSearchEngineIndex } from '../../../../../common/types/engines';

import { generateEncodedPath } from '../../../shared/encode_path_params';
import { EuiLinkTo } from '../../../shared/react_router_helpers';
import { SEARCH_INDEX_PATH } from '../../routes';
import { IngestionMethod } from '../../types';
import { ingestionMethodToText } from '../../utils/indices';

import { EnginesListLogic } from './engines_list_logic';

const healthColorsMap = {
  green: 'success',
  red: 'danger',
  unavailable: '',
  yellow: 'warning',
};
export const EngineListIndicesFlyout: React.FC = () => {
  const { fetchEngineData, fetchEngineName, isFetchEngineLoading, isFetchEngineFlyoutVisible } =
    useValues(EnginesListLogic);
  const { closeFetchIndicesFlyout } = useActions(EnginesListLogic);

  if (!fetchEngineData) return null;
  const { indices } = fetchEngineData;

  const columns: Array<EuiBasicTableColumn<EnterpriseSearchEngineIndex>> = [
    {
      field: 'name',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.enginesList.indicesFlyout.table.name.columnTitle',
        {
          defaultMessage: 'Index name',
        }
      ),
      render: (indexName: string) => (
        <EuiLinkTo
          data-test-subj="engine-index-link"
          data-telemetry-id="entSearchContent-engines-list-viewIndex"
          to={generateEncodedPath(SEARCH_INDEX_PATH, { indexName })}
        >
          {indexName}
        </EuiLinkTo>
      ),
      sortable: true,
      truncateText: true,
      width: '40%',
    },
    {
      field: 'health',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.enginesList.indicesFlyout.table.health.columnTitle',
        {
          defaultMessage: 'Index health',
        }
      ),
      render: (health: 'red' | 'green' | 'yellow' | 'unavailable') => (
        <span>
          <EuiIcon type="dot" color={healthColorsMap[health] ?? ''} />
          &nbsp;{health ?? '-'}
        </span>
      ),
      sortable: true,
      truncateText: true,
      width: '15%',
    },
    {
      field: 'count',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.enginesList.indicesFlyout.table.docsCount.columnTitle',
        {
          defaultMessage: 'Docs count',
        }
      ),
      sortable: true,
      truncateText: true,
      width: '15%',
    },
    {
      field: 'source',
      name: i18n.translate(
        'xpack.enterpriseSearch.content.enginesList.indicesFlyout.table.ingestionMethod.columnTitle',
        {
          defaultMessage: 'Ingestion method',
        }
      ),
      render: (source: IngestionMethod) => (
        <EuiText size="s">{ingestionMethodToText(source)}</EuiText>
      ),
      truncateText: true,
      width: '15%',
    },
  ];
  if (isFetchEngineFlyoutVisible) {
    return (
      <EuiFlyout ownFocus aria-labelledby="enginesListFlyout" onClose={closeFetchIndicesFlyout}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="engineListFlyout">
              {i18n.translate('xpack.enterpriseSearch.content.enginesList.indicesFlyout.title', {
                defaultMessage: 'View Indices',
              })}
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.enterpriseSearch.content.enginesList.indicesFlyout.subTitle"
              defaultMessage="View the indices associated with {engineName}"
              values={{
                engineName: fetchEngineName,
              }}
            />
          </EuiText>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          <EuiBasicTable items={indices} columns={columns} loading={isFetchEngineLoading} />
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  } else {
    return <></>;
  }
};
