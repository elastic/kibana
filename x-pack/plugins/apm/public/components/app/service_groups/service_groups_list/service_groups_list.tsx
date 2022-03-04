/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGrid } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { TypeOf } from '@kbn/typed-react-router-config';
import { SavedServiceGroup } from '../../../../../common/service_groups';
import { ServiceGroupsCard } from './service_group_card';
import { SERVICE_GROUP_COLOR_DEFAULT } from '../../../../../common/service_groups';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { ApmRoutes } from '../../../routing/apm_route_config';

interface Props {
  items: SavedServiceGroup[];
  isLoading: boolean;
}

export function ServiceGroupsListItems({ items }: Props) {
  const router = useApmRouter();
  const history = useHistory();
  const { query } = router.getParams('/*', history.location);
  return (
    <EuiFlexGrid gutterSize="m">
      {items.map((item) => (
        <ServiceGroupsCard
          serviceGroup={item}
          href={router.link(
            '/services',
            {
              query: { ...query, serviceGroup: item.id } as TypeOf<
                ApmRoutes,
                '/services'
              >['query'],
            },
            true // skips runtime param validation
          )}
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
        href={router.link(
          '/services',
          {
            query: { ...query, serviceGroup: '' } as TypeOf<
              ApmRoutes,
              '/services'
            >['query'],
          },
          true // skips runtime param validation
        )}
      />
    </EuiFlexGrid>
  );
}
