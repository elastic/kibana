/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiBasicTable, EuiSpacer, EuiHorizontalRule } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DeleteLocation } from './delete_location';
import { useLocationMonitors } from './hooks/use_location_monitors';
import { PolicyName } from './policy_name';
import { PrivateLocation } from '../../../../../common/runtime_types';
import { LOCATION_NAME_LABEL } from './location_form';
import { AGENT_POLICY_LABEL, MONITORS } from './locations_list';

export const PrivateLocationsTable = ({
  onDelete,
  privateLocations,
}: {
  onDelete: (id: string) => void;
  privateLocations: PrivateLocation[];
}) => {
  const { locationMonitors, loading } = useLocationMonitors();

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const columns = [
    {
      field: 'label',
      name: LOCATION_NAME_LABEL,
    },
    {
      field: 'monitors',
      name: MONITORS,
      align: 'right' as const,
    },
    {
      field: 'agentPolicyId',
      name: AGENT_POLICY_LABEL,
      render: (agentPolicyId: string) => <PolicyName agentPolicyId={agentPolicyId} />,
    },

    {
      field: 'id',
      name: ACTIONS_LABEL,
      align: 'right' as const,
      render: (id: string) => (
        <DeleteLocation
          id={id}
          locationMonitors={locationMonitors}
          onDelete={onDelete}
          loading={loading}
        />
      ),
    },
  ];

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: privateLocations.length,
    pageSizeOptions: [5, 10, 0],
    showPerPageOptions: true,
  };

  const items = privateLocations.map((location) => ({
    ...location,
    monitors: locationMonitors?.find((l) => l.id === location.id)?.count ?? 0,
  }));

  return (
    <div>
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="none" style={{ height: 2 }} />
      <EuiBasicTable<PrivateLocation & { monitors: number }>
        tableLayout="auto"
        tableCaption={PRIVATE_LOCATIONS}
        items={items}
        columns={columns}
        pagination={pagination}
        onChange={({ page = {} }) => {
          const { index, size } = page;
          setPageIndex(index ?? 0);
          setPageSize(size ?? 5);
        }}
      />
    </div>
  );
};

const PRIVATE_LOCATIONS = i18n.translate('xpack.synthetics.monitorManagement.privateLocations', {
  defaultMessage: 'Private locations',
});

const ACTIONS_LABEL = i18n.translate('xpack.synthetics.monitorManagement.actions', {
  defaultMessage: 'Actions',
});
