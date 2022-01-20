/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormControlLayout,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty, sortBy } from 'lodash';
import React, { useState } from 'react';
import { useLocalStorage } from '../../../../hooks/useLocalStorage';
import { data } from './mock';
import { Orientation } from './orientation';
import { ServiceGroupsList } from './service_groups_list';
import { Sort } from './sort';

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
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
          <EuiFlexItem>
            <EuiFormControlLayout
              fullWidth
              clear={{
                onClick: () => {
                  setFilter('');
                },
              }}
            >
              <EuiFieldText
                icon="search"
                fullWidth
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={i18n.translate('xpack.apm.servicesGroups.filter', {
                  defaultMessage: 'Filter groups',
                })}
              />
            </EuiFormControlLayout>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <Sort
              type={apmServiceGroupsSortType}
              onChange={setServiceGroupsSortType}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <Orientation
              type={apmServiceGroupsOrientation}
              onChange={setServiceGroupsOrientation}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  {i18n.translate('xpack.apm.serviceGroups.last24Hours', {
                    defaultMessage: 'Last 24 hous',
                  })}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="m" color="subdued">
                  |
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText style={{ fontWeight: 'bold' }} size="s">
                  {i18n.translate('xpack.apm.serviceGroups.groupsCount', {
                    defaultMessage:
                      '{servicesCount} {servicesCount, plural, =0 {group} one {group} other {groups}}',
                    values: { servicesCount: filteredItems.length },
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            {items.length ? (
              <ServiceGroupsList
                orientation={apmServiceGroupsOrientation}
                items={items}
              />
            ) : (
              <EuiEmptyPrompt
                iconType="layers"
                iconColor="black"
                title={
                  <h2>
                    {i18n.translate(
                      'xpack.apm.serviceGroups.emptyPrompt.serviceGroups',
                      { defaultMessage: 'Service groups' }
                    )}
                  </h2>
                }
                body={
                  <p>
                    {i18n.translate(
                      'xpack.apm.serviceGroups.emptyPrompt.message',
                      { defaultMessage: 'No groups found for this filter' }
                    )}
                  </p>
                }
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
