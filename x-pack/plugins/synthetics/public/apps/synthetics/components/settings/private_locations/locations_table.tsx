/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { TAGS_LABEL } from '../components/tags_field';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { setAddingNewPrivateLocation } from '../../../state/private_locations';
import { START_ADDING_LOCATIONS_DESCRIPTION } from './empty_locations';
import { PrivateLocation } from '../../../../../../common/runtime_types';
import { DeleteLocation } from './delete_location';
import { useLocationMonitors } from './hooks/use_location_monitors';
import { PolicyName } from './policy_name';
import { LOCATION_NAME_LABEL } from './location_form';
import { ClientPluginsStart } from '../../../../../plugin';

interface ListItem extends PrivateLocation {
  monitors: number;
}

export const PrivateLocationsTable = ({
  onDelete,
  privateLocations,
}: {
  onDelete: (id: string) => void;
  privateLocations: PrivateLocation[];
}) => {
  const dispatch = useDispatch();

  const { locationMonitors, loading } = useLocationMonitors();

  const { canSave } = useSyntheticsSettingsContext();

  const tagsList = privateLocations.reduce((acc, item) => {
    const tags = item.tags || [];
    return [...acc, ...tags];
  }, [] as string[]);

  const columns = [
    {
      field: 'label',
      name: LOCATION_NAME_LABEL,
    },
    {
      field: 'monitors',
      name: MONITORS,
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
              loading={loading}
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

  const { fleet } = useKibana<ClientPluginsStart>().services;

  const hasFleetPermissions = Boolean(fleet?.authz.fleet.readAgentPolicies);

  const renderToolRight = () => {
    return [
      <EuiButton
        fill
        data-test-subj={'addPrivateLocationButton'}
        isLoading={loading}
        disabled={!hasFleetPermissions || !canSave}
        onClick={() => setIsAddingNew(true)}
      >
        {ADD_LABEL}
      </EuiButton>,
    ];
  };

  return (
    <div>
      <EuiText>{START_ADDING_LOCATIONS_DESCRIPTION}</EuiText>
      <EuiSpacer size="s" />
      <EuiInMemoryTable<ListItem>
        itemId={'id'}
        tableLayout="auto"
        tableCaption={PRIVATE_LOCATIONS}
        items={items}
        columns={columns}
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
              options: tagsList.map((tag) => ({
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

const ADD_LABEL = i18n.translate('xpack.synthetics.monitorManagement.addLocation', {
  defaultMessage: 'Add location',
});
