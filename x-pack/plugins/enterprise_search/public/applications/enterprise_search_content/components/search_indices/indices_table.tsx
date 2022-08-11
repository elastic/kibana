/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { generatePath } from 'react-router-dom';

import {
  CriteriaWithPagination,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiIcon,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { Meta } from '../../../../../common/types';
import { EuiLinkTo, EuiButtonIconTo } from '../../../shared/react_router_helpers';
import { EuiBadgeTo } from '../../../shared/react_router_helpers/eui_components';
import { convertMetaToPagination } from '../../../shared/table_pagination';
import { SEARCH_INDEX_PATH } from '../../routes';
import { ElasticsearchViewIndex, IngestionMethod } from '../../types';
import { crawlerStatusToColor, crawlerStatusToText } from '../../utils/crawler_status_helpers';
import { ingestionMethodToText, isCrawlerIndex } from '../../utils/indices';
import {
  ingestionStatusToColor,
  ingestionStatusToText,
} from '../../utils/ingestion_status_helpers';

const healthColorsMap = {
  green: 'success',
  red: 'danger',
  unavailable: '',
  yellow: 'warning',
};

const columns: Array<EuiBasicTableColumn<ElasticsearchViewIndex>> = [
  {
    field: 'name',
    name: i18n.translate('xpack.enterpriseSearch.content.searchIndices.name.columnTitle', {
      defaultMessage: 'Index name',
    }),
    render: (name: string) => (
      <EuiLinkTo
        data-test-subj="search-index-link"
        to={generatePath(SEARCH_INDEX_PATH, { indexName: name })}
      >
        {name}
      </EuiLinkTo>
    ),
    sortable: true,
    truncateText: true,
    width: '40%',
  },
  {
    field: 'health',
    name: i18n.translate('xpack.enterpriseSearch.content.searchIndices.health.columnTitle', {
      defaultMessage: 'Index health',
    }),
    render: (health: 'red' | 'green' | 'yellow' | 'unavailable') => (
      <span>
        <EuiIcon type="dot" color={healthColorsMap[health] ?? ''} />
        &nbsp;{health ?? '-'}
      </span>
    ),
    sortable: true,
    truncateText: true,
    width: '10%',
  },
  {
    field: 'count',
    name: i18n.translate('xpack.enterpriseSearch.content.searchIndices.docsCount.columnTitle', {
      defaultMessage: 'Docs count',
    }),
    sortable: true,
    truncateText: true,
    width: '10%',
  },
  {
    field: 'ingestionMethod',
    name: i18n.translate(
      'xpack.enterpriseSearch.content.searchIndices.ingestionMethod.columnTitle',
      {
        defaultMessage: 'Ingestion method',
      }
    ),
    render: (ingestionMethod: IngestionMethod) => (
      <EuiText size="s">{ingestionMethodToText(ingestionMethod)}</EuiText>
    ),
    truncateText: true,
    width: '10%',
  },
  {
    name: i18n.translate(
      'xpack.enterpriseSearch.content.searchIndices.ingestionStatus.columnTitle',
      {
        defaultMessage: 'Ingestion status',
      }
    ),
    render: (index: ElasticsearchViewIndex) => {
      const overviewPath = generatePath(SEARCH_INDEX_PATH, { indexName: index.name });
      if (isCrawlerIndex(index)) {
        const label = crawlerStatusToText(index.crawler?.most_recent_crawl_request_status);

        return (
          <EuiBadgeTo
            to={overviewPath}
            label={label}
            color={crawlerStatusToColor(index.crawler?.most_recent_crawl_request_status)}
          />
        );
      } else {
        const label = ingestionStatusToText(index.ingestionStatus);
        return (
          <EuiBadgeTo
            to={overviewPath}
            label={label}
            color={ingestionStatusToColor(index.ingestionStatus)}
          />
        );
      }
    },
    truncateText: true,
    width: '10%',
  },
  {
    actions: [
      {
        render: ({ name }) => (
          <EuiButtonIconTo
            aria-label={name}
            iconType="eye"
            data-test-subj="view-search-index-button"
            to={generatePath(SEARCH_INDEX_PATH, {
              indexName: name,
            })}
          />
        ),
      },
    ],
    name: i18n.translate('xpack.enterpriseSearch.content.searchIndices.actions.columnTitle', {
      defaultMessage: 'Actions',
    }),
    width: '5%',
  },
];

interface IndicesTableProps {
  indices: ElasticsearchViewIndex[];
  isLoading?: boolean;
  meta: Meta;
  onChange: (criteria: CriteriaWithPagination<ElasticsearchViewIndex>) => void;
}

export const IndicesTable: React.FC<IndicesTableProps> = ({
  indices,
  isLoading,
  meta,
  onChange,
}) => (
  <EuiBasicTable
    items={indices}
    columns={columns}
    onChange={onChange}
    pagination={{ ...convertMetaToPagination(meta), showPerPageOptions: false }}
    tableLayout="fixed"
    loading={isLoading}
  />
);
