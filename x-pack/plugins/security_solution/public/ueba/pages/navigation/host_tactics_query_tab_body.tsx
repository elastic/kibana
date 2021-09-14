/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import React from 'react';
import { useHostTactics } from '../../containers/host_tactics';
import { HostQueryProps } from './types';
import { manageQuery } from '../../../common/components/page/manage_query';
import { HostTacticsTable } from '../../components/host_tactics_table';

const HostTacticsTableManage = manageQuery(HostTacticsTable);

export const HostTacticsQueryTabBody = ({
  deleteQuery,
  docValueFields,
  endDate,
  filterQuery,
  hostName,
  indexNames,
  skip,
  setQuery,
  startDate,
  type,
}: HostQueryProps) => {
  const [
    loading,
    { data, techniqueCount, totalCount, pageInfo, loadPage, id, inspect, isInspected, refetch },
  ] = useHostTactics({
    docValueFields,
    endDate,
    filterQuery,
    hostName,
    indexNames,
    skip,
    startDate,
    type,
  });

  return (
    <HostTacticsTableManage
      deleteQuery={deleteQuery}
      data={data}
      fakeTotalCount={getOr(50, 'fakeTotalCount', pageInfo)}
      id={id}
      inspect={inspect}
      isInspect={isInspected}
      loading={loading}
      loadPage={loadPage}
      refetch={refetch}
      setQuery={setQuery}
      showMorePagesIndicator={getOr(false, 'showMorePagesIndicator', pageInfo)}
      techniqueCount={techniqueCount}
      totalCount={totalCount}
      type={type}
    />
  );
};

HostTacticsQueryTabBody.displayName = 'HostTacticsQueryTabBody';
