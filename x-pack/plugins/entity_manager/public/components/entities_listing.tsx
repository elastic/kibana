/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EntityDefinitionWithState, EntityLatestDoc } from '@kbn/entities-schema';
import {
  Criteria,
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiSpacer,
  EuiTableSortingType,
} from '@elastic/eui';
import { capitalize, has, lowerCase } from 'lodash';
import moment from 'moment';
import numeral from '@elastic/numeral';
import { useFetchEntities } from '../hooks/use_fetch_entities';
import { Pagination } from './pagination';

interface EntitiesListingProps {
  definition?: EntityDefinitionWithState;
  defaultPerPage?: number;
}

export function EntitiesListing({ definition, defaultPerPage = 10 }: EntitiesListingProps) {
  const [searchAfter, setSearchAfter] = useState<string | undefined>();
  const [perPage, setPerPage] = useState<number>(defaultPerPage);
  const [sortField, setSortField] = useState<string>('entity.type');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const { data } = useFetchEntities({
    query: definition ? `entity.definitionId: "${definition.id}"` : '',
    sortField,
    sortDirection,
    perPage,
    searchAfter,
  });

  const columns: Array<EuiBasicTableColumn<EntityLatestDoc>> = [
    {
      field: 'entity.displayName',
      name: i18n.translate('xpack.entityManager.entitiesListing.nameLabel', {
        defaultMessage: 'Name',
      }),
      truncateText: true,
      sortable: true,
    },
    {
      field: 'entity.type',
      name: i18n.translate('xpack.entityManager.entitiesListing.typeLabel', {
        defaultMessage: 'Type',
      }),
      render: (type: string) => <EuiBadge>{type}</EuiBadge>,
      sortable: true,
    },
    {
      field: 'entity.firstSeenTimestamp',
      name: i18n.translate('xpack.entityManager.entitiesListing.firstSeenLabel', {
        defaultMessage: 'First seen',
      }),
      render: (value: string) => moment(value).format('ll LT'),
      truncateText: true,
      sortable: true,
    },
    {
      field: 'entity.lastSeenTimestamp',
      name: i18n.translate('xpack.entityManager.entitiesListing.lastSeenLabel', {
        defaultMessage: 'Last seen',
      }),
      render: (value: string) => moment(value).format('ll LT'),
      truncateText: true,
      sortable: true,
    },
  ];

  if (definition) {
    definition?.metrics?.forEach((metric) => {
      if (data && data.entities.some((entity) => has(entity, ['entity', 'metrics', metric.name]))) {
        columns.push({
          field: `entity.metrics.${metric.name}`,
          name: capitalize(lowerCase(metric.name)),
          render: (value: number) => (value != null ? numeral(value).format('0,0[.0]') : '--'),
          sortable: true,
        });
      }
    });
  } else {
    columns.push({
      field: 'entity.metrics.logRate',
      name: 'Log rate',
      render: (value: number) => (value != null ? numeral(value).format('0,0[.0]') : '--'),
      sortable: true,
    });
  }

  const sorting: EuiTableSortingType<EntityLatestDoc> = {
    sort: {
      field: (sortField === 'entity.displayName.keyword'
        ? 'entity.displayName'
        : sortField) as 'entity',
      direction: sortDirection,
    },
  };

  const handleTableChange = ({ sort }: Criteria<EntityLatestDoc>) => {
    if (sort) {
      if (sort.field === ('entity.displayName' as 'entity')) {
        setSortField('entity.displayName.keyword');
      } else {
        setSortField(sort.field);
      }
      setSortDirection(sort.direction);
      setSearchAfter(undefined);
    }
  };

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setSearchAfter(undefined);
  };

  return (
    <>
      <EuiBasicTable
        columns={columns}
        items={data?.entities ?? []}
        sorting={sorting}
        onChange={handleTableChange}
      />
      <EuiSpacer size="m" />
      <Pagination
        searchAfter={data?.searchAfter ?? searchAfter}
        onPageChange={setSearchAfter}
        total={data?.total}
        perPage={perPage}
        onPerPageChange={handlePerPageChange}
        sort={sorting}
      />
    </>
  );
}
