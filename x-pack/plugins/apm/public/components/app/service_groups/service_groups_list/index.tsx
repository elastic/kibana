/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiEmptyPrompt,
  EuiLoadingLogo,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormControlLayout,
  EuiText,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty, sortBy } from 'lodash';
import React, { useState, useCallback, useMemo } from 'react';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';
import { ServiceGroupsListItems } from './service_groups_list';
import { Sort } from './sort';
import { RefreshServiceGroupsSubscriber } from '../refresh_service_groups_subscriber';
import { getDateRange } from '../../../../context/url_params_context/helpers';
import { ServiceGroupSaveButton } from '../service_group_save';
import { BetaBadge } from '../../../shared/beta_badge';

export type ServiceGroupsSortType = 'recently_added' | 'alphabetical';

export function ServiceGroupsList() {
  const [filter, setFilter] = useState('');

  const [apmServiceGroupsSortType, setServiceGroupsSortType] =
    useState<ServiceGroupsSortType>('recently_added');

  const {
    data = { serviceGroups: [] },
    status,
    refetch,
  } = useFetcher(
    (callApmApi) => callApmApi('GET /internal/apm/service-groups'),
    []
  );

  const { serviceGroups } = data;

  const { start, end } = useMemo(
    () => getDateRange({ rangeFrom: 'now-24h', rangeTo: 'now' }),
    []
  );

  const { data: servicesCountData = { servicesCounts: {} } } = useFetcher(
    (callApmApi) => {
      if (start && end && serviceGroups.length) {
        return callApmApi('GET /internal/apm/service_groups/services_count', {
          params: { query: { start, end } },
        });
      }
    },
    [start, end, serviceGroups.length]
  );

  const isLoading =
    status === FETCH_STATUS.NOT_INITIATED || status === FETCH_STATUS.LOADING;

  const filteredItems = isEmpty(filter)
    ? serviceGroups
    : serviceGroups.filter((item) =>
        item.groupName.toLowerCase().includes(filter.toLowerCase())
      );

  const sortedItems = sortBy(filteredItems, (item) =>
    apmServiceGroupsSortType === 'alphabetical'
      ? item.groupName.toLowerCase()
      : item.updatedAt
  );

  const items =
    apmServiceGroupsSortType === 'recently_added'
      ? sortedItems.reverse()
      : sortedItems;

  const clearFilterCallback = useCallback(() => {
    setFilter('');
  }, []);

  if (isLoading) {
    return (
      <EuiEmptyPrompt
        icon={<EuiLoadingLogo logo="logoObservability" size="xl" />}
        title={
          <h2>
            {i18n.translate('xpack.apm.servicesGroups.loadingServiceGroups', {
              defaultMessage: 'Loading service groups',
            })}
          </h2>
        }
      />
    );
  }

  return (
    <RefreshServiceGroupsSubscriber onRefresh={refetch}>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
            <EuiFlexItem>
              <EuiFormControlLayout
                fullWidth
                clear={
                  !isEmpty(filter)
                    ? { onClick: clearFilterCallback }
                    : undefined
                }
              >
                <EuiFieldText
                  icon="search"
                  fullWidth
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder={i18n.translate(
                    'xpack.apm.servicesGroups.filter',
                    { defaultMessage: 'Filter groups' }
                  )}
                />
              </EuiFormControlLayout>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <Sort
                type={apmServiceGroupsSortType}
                onChange={setServiceGroupsSortType}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiFlexGroup direction="row" gutterSize="m">
                {serviceGroups.length ? (
                  <>
                    <EuiFlexItem grow={1}>
                      <EuiFlexGroup gutterSize="s">
                        <EuiFlexItem grow={false}>
                          <EuiText style={{ fontWeight: 'bold' }} size="s">
                            {i18n.translate(
                              'xpack.apm.serviceGroups.groupsCount',
                              {
                                defaultMessage:
                                  '{servicesCount} {servicesCount, plural, =0 {groups} one {group} other {groups}}',
                                values: { servicesCount: filteredItems.length },
                              }
                            )}
                          </EuiText>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                      <EuiText color="subdued" size="s">
                        {i18n.translate(
                          'xpack.apm.serviceGroups.listDescription',
                          {
                            defaultMessage:
                              'Displayed service counts reflect the last 24 hours.',
                          }
                        )}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <ServiceGroupSaveButton />
                    </EuiFlexItem>
                  </>
                ) : null}
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup
                alignItems="center"
                justifyContent="flexStart"
                gutterSize="s"
              >
                <EuiFlexItem grow={false}>
                  <div>
                    <BetaBadge />
                  </div>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiLink
                    href="https://ela.st/feedback-service-groups"
                    target="_blank"
                  >
                    {i18n.translate(
                      'xpack.apm.serviceGroups.beta.feedback.link',
                      { defaultMessage: 'Send feedback' }
                    )}
                  </EuiLink>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              {serviceGroups.length ? (
                items.length ? (
                  <ServiceGroupsListItems
                    items={items}
                    servicesCounts={servicesCountData.servicesCounts}
                    isLoading={isLoading}
                  />
                ) : (
                  <EuiEmptyPrompt
                    iconType="layers"
                    iconColor="black"
                    title={
                      <h2>
                        {i18n.translate(
                          'xpack.apm.serviceGroups.filtered.emptyPrompt.serviceGroups',
                          { defaultMessage: 'Service groups' }
                        )}
                      </h2>
                    }
                    body={
                      <p>
                        {i18n.translate(
                          'xpack.apm.serviceGroups.filtered.emptyPrompt.message',
                          { defaultMessage: 'No groups found for this filter' }
                        )}
                      </p>
                    }
                  />
                )
              ) : (
                <EuiEmptyPrompt
                  iconType="addDataApp"
                  title={
                    <h2>
                      {i18n.translate(
                        'xpack.apm.serviceGroups.data.emptyPrompt.noServiceGroups',
                        { defaultMessage: 'No service groups' }
                      )}
                    </h2>
                  }
                  body={
                    <p>
                      {i18n.translate(
                        'xpack.apm.serviceGroups.data.emptyPrompt.message',
                        {
                          defaultMessage:
                            'Start grouping and organising your services and your application. Learn more about Service groups or create a group.',
                        }
                      )}
                    </p>
                  }
                  actions={<ServiceGroupSaveButton />}
                />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </RefreshServiceGroupsSubscriber>
  );
}
