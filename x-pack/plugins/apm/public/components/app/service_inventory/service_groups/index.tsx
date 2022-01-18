/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonGroup, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useLocalStorage } from '../../../../hooks/useLocalStorage';
import { ServiceGroupsList } from './service_groups_list';

export type ServiceGroupsOrientation = 'grid' | 'list';

export function ServiceGroups() {
  const [apmServiceGroupsOrientation, setServiceGroupsOrientation] =
    useLocalStorage<ServiceGroupsOrientation>(
      'apm.serviceGroupsOrientation',
      'grid'
    );

  return (
    <>
      <EuiButtonGroup
        legend={i18n.translate('xpack.apm.serviceGroups.orientation', {
          defaultMessage: 'Service groups orientation',
        })}
        options={[
          { id: `grid`, label: <EuiIcon type="grid" /> },
          { id: `list`, label: <EuiIcon type="list" /> },
        ]}
        idSelected={apmServiceGroupsOrientation}
        onChange={(id) =>
          setServiceGroupsOrientation(id as ServiceGroupsOrientation)
        }
      />
      <ServiceGroupsList orientation={apmServiceGroupsOrientation} />
    </>
  );
}
