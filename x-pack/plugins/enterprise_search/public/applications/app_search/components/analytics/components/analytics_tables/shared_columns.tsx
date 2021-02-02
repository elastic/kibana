/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { EuiLinkTo } from '../../../../../shared/react_router_helpers';
import { KibanaLogic } from '../../../../../shared/kibana';
import { ENGINE_ANALYTICS_QUERY_DETAIL_PATH } from '../../../../routes';
import { generateEnginePath } from '../../../engine';

import { Query, RecentQuery } from '../../types';
import { InlineTagsList } from './inline_tags_list';

/**
 * Shared columns / column properties between separate analytics tables
 */

export const FIRST_COLUMN_PROPS = {
  truncateText: true,
  width: '25%',
  mobileOptions: {
    enlarge: true,
    width: '100%',
  },
};

export const TERM_COLUMN_PROPS = {
  // Field key changes per-table
  name: i18n.translate('xpack.enterpriseSearch.appSearch.engine.analytics.table.termColumn', {
    defaultMessage: 'Search term',
  }),
  render: (query: Query['key']) => {
    if (!query) query = '""';
    return (
      <EuiLinkTo to={generateEnginePath(ENGINE_ANALYTICS_QUERY_DETAIL_PATH, { query })}>
        {query}
      </EuiLinkTo>
    );
  },
  ...FIRST_COLUMN_PROPS,
};

export const ACTIONS_COLUMN = {
  width: '120px',
  actions: [
    {
      name: i18n.translate('xpack.enterpriseSearch.appSearch.engine.analytics.table.viewAction', {
        defaultMessage: 'View',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.analytics.table.viewTooltip',
        { defaultMessage: 'View query analytics' }
      ),
      type: 'icon',
      icon: 'popout',
      color: 'primary',
      onClick: (item: Query | RecentQuery) => {
        const { navigateToUrl } = KibanaLogic.values;

        const query = (item as Query).key || (item as RecentQuery).query_string;
        navigateToUrl(generateEnginePath(ENGINE_ANALYTICS_QUERY_DETAIL_PATH, { query }));
      },
      'data-test-subj': 'AnalyticsTableViewQueryButton',
    },
    {
      name: i18n.translate('xpack.enterpriseSearch.appSearch.engine.analytics.table.editAction', {
        defaultMessage: 'Edit',
      }),
      description: i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.analytics.table.editTooltip',
        { defaultMessage: 'Edit query analytics' }
      ),
      type: 'icon',
      icon: 'pencil',
      onClick: () => {
        // TODO: CurationsLogic
      },
      'data-test-subj': 'AnalyticsTableEditQueryButton',
    },
  ],
};

export const TAGS_COLUMN = {
  field: 'tags',
  name: i18n.translate('xpack.enterpriseSearch.appSearch.engine.analytics.table.tagsColumn', {
    defaultMessage: 'Analytics tags',
  }),
  truncateText: true,
  render: (tags: Query['tags']) => <InlineTagsList tags={tags} />,
};

export const COUNT_COLUMN_PROPS = {
  dataType: 'number',
  width: '100px',
};
