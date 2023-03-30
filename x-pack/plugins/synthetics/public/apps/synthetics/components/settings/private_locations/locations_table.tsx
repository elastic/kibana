/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDispatch } from 'react-redux';
import { Criteria } from '@elastic/eui/src/components/basic_table/basic_table';
import { ViewLocationMonitors } from './view_location_monitors';
import { TableTitle } from '../../common/components/table_title';
import { TAGS_LABEL } from '../components/tags_field';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { useCanManagePrivateLocation } from '../../../hooks';
import { setAddingNewPrivateLocation } from '../../../state/private_locations';
import { PrivateLocationDocsLink, START_ADDING_LOCATIONS_DESCRIPTION } from './empty_locations';
import { PrivateLocation } from '../../../../../../common/runtime_types';
import { CANNOT_SAVE_INTEGRATION_LABEL } from '../../common/components/permissions';
import { DeleteLocation } from './delete_location';
import { useLocationMonitors } from './hooks/use_location_monitors';
import { PolicyName } from './policy_name';
import { LOCATION_NAME_LABEL } from './location_form';

interface ListItem extends PrivateLocation {
  monitors: number;
}

export const PrivateLocationsTable = ({
  deleteLoading,
  onDelete,
  privateLocations,
}: {
  deleteLoading: boolean;
  onDelete: (id: string) => void;
  privateLocations: PrivateLocation[];
}) => {
  const dispatch = useDispatch();

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const { locationMonitors, loading } = useLocationMonitors();

  const { canSave } = useSyntheticsSettingsContext();
  const canManagePrivateLocations = useCanManagePrivateLocation();

  const tagsList = privateLocations.reduce((acc, item) => {
    const tags = item.tags || [];
    return new Set([...acc, ...tags]);
  }, new Set<string>());

  const columns = [
    {
      field: 'label',
      name: LOCATION_NAME_LABEL,
    },
    {
      field: 'monitors',
      name: MONITORS,
      render: (monitors: number, item: ListItem) => (
        <ViewLocationMonitors count={monitors} locationName={item.label} />
      ),
    },
    {
      field: 'agentPolicyId',
      name: AGENT_POLICY_LABEL,
      render: (agentPolicyId: string) => <PolicyName agentPolicyId={agentPolicyId} />,
    },
    {
      name: TAGS_LABEL,
      field: 'tags',
      sortable: true,
      render: (val: string[]) => {
        const tags = val ?? [];
        if (tags.length === 0) {
          return <EuiText>--</EuiText>;
        }
        return (
          <EuiFlexGroup gutterSize="xs" wrap>
            {tags.map((tag) => (
              <EuiFlexItem grow={false} key={tag}>
                <EuiBadge>{tag}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        );
      },
    },
    {
      name: ACTIONS_LABEL,
      actions: [
        {
          name: DELETE_LOCATION,
          description: DELETE_LOCATION,
          render: (item: ListItem) => (
            <DeleteLocation
              id={item.id}
              label={item.label}
              locationMonitors={locationMonitors}
              onDelete={onDelete}
              loading={deleteLoading}
            />
          ),
          isPrimary: true,
          'data-test-subj': 'action-delete',
        },
      ],
    },
  ];

  const items = privateLocations.map((location) => ({
    ...location,
    monitors: locationMonitors?.find((l) => l.id === location.id)?.count ?? 0,
  }));

  const setIsAddingNew = (val: boolean) => dispatch(setAddingNewPrivateLocation(val));

  const renderToolRight = () => {
    return [
      <EuiButton
        key="addPrivateLocationButton"
        fill
        data-test-subj={'addPrivateLocationButton'}
        isLoading={loading}
        disabled={!canManagePrivateLocations || !canSave}
        onClick={() => setIsAddingNew(true)}
        iconType="plusInCircle"
        title={!canManagePrivateLocations ? CANNOT_SAVE_INTEGRATION_LABEL : undefined}
      >
        {ADD_LABEL}
      </EuiButton>,
    ];
  };

  return (
    <div>
      <EuiText>
        {START_ADDING_LOCATIONS_DESCRIPTION} <PrivateLocationDocsLink label={LEARN_MORE} />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiInMemoryTable<ListItem>
        itemId={'id'}
        tableLayout="auto"
        tableCaption={PRIVATE_LOCATIONS}
        items={items}
        columns={columns}
        childrenBetween={
          <TableTitle
            total={items.length}
            label={PRIVATE_LOCATIONS}
            pageIndex={pageIndex}
            pageSize={pageSize}
          />
        }
        pagination={{
          pageSize,
          pageIndex,
        }}
        onTableChange={({ page }: Criteria<any>) => {
          setPageIndex(page?.index ?? 0);
          setPageSize(page?.size ?? 10);
        }}
        search={{
          toolsRight: renderToolRight(),
          box: {
            incremental: true,
          },
          filters: [
            {
              type: 'field_value_selection',
              field: 'tags',
              name: TAGS_LABEL,
              multiSelect: true,
              options: [...tagsList].map((tag) => ({
                value: tag,
                name: tag,
                view: tag,
              })),
            },
          ],
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

export const MONITORS = i18n.translate('xpack.synthetics.monitorManagement.monitors', {
  defaultMessage: 'Monitors',
});

export const AGENT_POLICY_LABEL = i18n.translate('xpack.synthetics.monitorManagement.agentPolicy', {
  defaultMessage: 'Agent Policy',
});

const DELETE_LOCATION = i18n.translate(
  'xpack.synthetics.settingsRoute.privateLocations.deleteLabel',
  {
    defaultMessage: 'Delete private location',
  }
);

const ADD_LABEL = i18n.translate('xpack.synthetics.monitorManagement.createLocation', {
  defaultMessage: 'Create location',
});

export const LEARN_MORE = i18n.translate('xpack.synthetics.privateLocations.learnMore.label', {
  defaultMessage: 'Learn more.',
});
