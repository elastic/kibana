/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty, sortBy } from 'lodash';
import React, { useState } from 'react';
import { useLocalStorage } from '../../../../hooks/useLocalStorage';
import { data } from './mock';
import { Orientation } from './orientation';
import { ServiceGroupsList } from './service_groups_list';
import { Sort } from './Sort';

export type ServiceGroupsOrientation = 'grid' | 'list';
export type ServiceGroupsSortType = 'recently_added' | 'alphabetical';

export function ServiceGroups() {
  const [filter, setFilter] = useState('');

  const [apmServiceGroupsOrientation, setServiceGroupsOrientation] =
    useLocalStorage<ServiceGroupsOrientation>(
      'apm.serviceGroupsOrientation',
      'grid'
    );

  const [apmServiceGroupsSortType, setServiceGroupsSortType] =
    useLocalStorage<ServiceGroupsSortType>(
      'apm.serviceGroupsSortType',
      'recently_added'
    );

  const filteredItems = isEmpty(filter)
    ? data
    : data.filter((item) =>
        item.name.toLowerCase().includes(filter.toLowerCase())
      );

  const items = sortBy(filteredItems, (item) =>
    apmServiceGroupsSortType === 'alphabetical' ? item.name : item.createdAt
  );

  return (
    <>
      <EuiFieldText
        icon="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={i18n.translate('xpack.apm.servicesGroups.filter', {
          defaultMessage: 'Filter groups',
        })}
      />

      <Sort
        type={apmServiceGroupsSortType}
        onChange={setServiceGroupsSortType}
      />
      <Orientation
        type={apmServiceGroupsOrientation}
        onChange={setServiceGroupsOrientation}
      />
      <ServiceGroupsList
        orientation={apmServiceGroupsOrientation}
        items={items}
      />
    </>
  );
}
