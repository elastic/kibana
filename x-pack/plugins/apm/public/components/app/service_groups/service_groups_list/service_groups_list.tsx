/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { SavedServiceGroup } from '../../../../../common/service_groups';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { useDefaultEnvironment } from '../../../../hooks/use_default_environment';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { ServiceGroupsCard } from './service_group_card';

interface Props {
  items: SavedServiceGroup[];
  serviceGroupCounts: APIReturnType<'GET /internal/apm/service-group/counts'>;
  isLoading: boolean;
}

export function ServiceGroupsListItems({
  items,
  serviceGroupCounts,
  isLoading,
}: Props) {
  const router = useApmRouter();
  const { query } = useApmParams('/service-groups');

  const environment = useDefaultEnvironment();

  return (
    <EuiFlexGroup gutterSize="m" wrap>
      {items.map((item) => (
        <ServiceGroupsCard
          key={item.id}
          serviceGroup={item}
          serviceGroupCounts={serviceGroupCounts[item.id]}
          href={router.link('/services', {
            query: {
              ...query,
              serviceGroup: item.id,
              environment,
              kuery: '',
            },
          })}
          isLoading={isLoading}
        />
      ))}
    </EuiFlexGroup>
  );
}
