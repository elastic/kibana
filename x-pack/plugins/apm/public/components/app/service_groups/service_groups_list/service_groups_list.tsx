/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGrid } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { SavedServiceGroup } from '../../../../../common/service_groups';
import { ServiceGroupsCard } from './service_group_card';
import { SERVICE_GROUP_COLOR_DEFAULT } from '../../../../../common/service_groups';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';

interface Props {
  items: SavedServiceGroup[];
  isLoading: boolean;
}

export function ServiceGroupsListItems({ items }: Props) {
  const router = useApmRouter();
  const { query } = useApmParams('/service-groups');
  return (
    <EuiFlexGrid gutterSize="m">
      {items.map((item) => (
        <ServiceGroupsCard
          serviceGroup={item}
          href={router.link('/services', {
            query: {
              ...query,
              serviceGroup: item.id,
              environment: ENVIRONMENT_ALL.value,
              kuery: '',
            },
          })}
        />
      ))}
      <ServiceGroupsCard
        serviceGroup={{
          groupName: i18n.translate(
            'xpack.apm.serviceGroups.list.allServices.name',
            { defaultMessage: 'All services' }
          ),
          kuery: 'service.name : *',
          description: i18n.translate(
            'xpack.apm.serviceGroups.list.allServices.description',
            { defaultMessage: 'View all services' }
          ),
          serviceNames: [],
          color: SERVICE_GROUP_COLOR_DEFAULT,
        }}
        hideServiceCount
        href={router.link('/services', {
          query: {
            ...query,
            serviceGroup: '',
            environment: ENVIRONMENT_ALL.value,
            kuery: '',
          },
        })}
      />
    </EuiFlexGrid>
  );
}
