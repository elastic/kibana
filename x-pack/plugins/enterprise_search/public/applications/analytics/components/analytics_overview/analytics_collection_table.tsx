/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { AnalyticsCollection } from '../../../../../common/types/analytics';
import { generateEncodedPath } from '../../../shared/encode_path_params';
import { KibanaLogic } from '../../../shared/kibana';
import { EuiLinkTo } from '../../../shared/react_router_helpers';

import { COLLECTION_VIEW_PATH } from '../../routes';

interface AnalyticsCollectionTableProps {
  collections: AnalyticsCollection[];
  isLoading: boolean;
}

export const AnalyticsCollectionTable: React.FC<AnalyticsCollectionTableProps> = ({
  collections,
  isLoading,
}) => {
  const { navigateToUrl } = useValues(KibanaLogic);

  const columns: Array<EuiBasicTableColumn<AnalyticsCollection>> = [
    {
      field: 'name',
      name: 'Name',
      render: (name: string, collection: AnalyticsCollection) => (
        <EuiLinkTo
          to={generateEncodedPath(COLLECTION_VIEW_PATH, {
            id: collection.id,
            section: 'events',
          })}
        >
          {name}
        </EuiLinkTo>
      ),
      width: '60%',
    },
    {
      actions: [
        {
          description: 'View this analytics collection',
          icon: 'eye',
          isPrimary: true,
          name: (collection) => `View ${collection.name}`,
          onClick: (collection) =>
            navigateToUrl(
              generateEncodedPath(COLLECTION_VIEW_PATH, {
                id: collection.id,
                section: 'events',
              })
            ),
          type: 'icon',
        },
      ],
      align: 'right',
      name: i18n.translate('xpack.enterpriseSearch.analytics.collections.actions.columnTitle', {
        defaultMessage: 'Actions',
      }),
      width: '40%',
    },
  ];

  return (
    <EuiBasicTable items={collections} columns={columns} tableLayout="fixed" loading={isLoading} />
  );
};
