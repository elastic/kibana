/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGrid } from '@elastic/eui';
import React from 'react';
import { SavedServiceGroup } from '../../../../../common/service_groups';
import { ServiceGroupsCard } from './service_group_card';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useDefaultEnvironment } from '../../../../hooks/use_default_environment';

interface Props {
  items: SavedServiceGroup[];
  servicesCounts: Record<string, number>;
  isLoading: boolean;
}

export function ServiceGroupsListItems({ items, servicesCounts }: Props) {
  const router = useApmRouter();
  const { query } = useApmParams('/service-groups');

  const environment = useDefaultEnvironment();

  return (
    <EuiFlexGrid gutterSize="m">
      {items.map((item) => (
        <ServiceGroupsCard
          serviceGroup={item}
          servicesCount={servicesCounts[item.id]}
          href={router.link('/services', {
            query: {
              ...query,
              serviceGroup: item.id,
              environment,
              kuery: '',
            },
          })}
        />
      ))}
    </EuiFlexGrid>
  );
}
