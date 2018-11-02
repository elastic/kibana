/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiToolTip, IconColor } from '@elastic/eui';
import { first, sortBy, sortByOrder, uniq } from 'lodash';
import moment from 'moment';
import React from 'react';
import { BeatTag, CMPopulatedBeat, ConfigurationBlock } from '../../../common/domain_types';
import { ConnectedLink } from '../connected_link';
import { TagBadge } from '../tag';

export interface ColumnDefinition {
  align?: string;
  field: string;
  name: string;
  sortable?: boolean;
  width?: string;
  render?(value: any, object?: any): any;
}

export interface ActionDefinition {
  action: string;
  danger?: boolean;
  icon?: any;
  name: string;
}

interface FilterOption {
  value: string;
}

export interface FilterDefinition {
  field: string;
  name: string;
  options?: FilterOption[];
  type: string;
}

export interface ControlDefinitions {
  actions: ActionDefinition[];
  filters: FilterDefinition[];
  primaryActions?: ActionDefinition[];
}

export interface TableType {
  columnDefinitions: ColumnDefinition[];
  controlDefinitions(items: any[]): ControlDefinitions;
}

export const BeatsTableType: TableType = {
  columnDefinitions: [
    {
      field: 'name',
      name: 'Beat name',
      render: (name: string, beat: CMPopulatedBeat) => (
        <ConnectedLink path={`/beat/${beat.id}`}>{name}</ConnectedLink>
      ),
      sortable: true,
    },
    {
      field: 'type',
      name: 'Type',
      sortable: true,
    },
    {
      field: 'full_tags',
      name: 'Tags',
      render: (value: string, beat: CMPopulatedBeat) => (
        <EuiFlexGroup wrap responsive={true} gutterSize="xs">
          {(sortBy(beat.full_tags, 'id') || []).map(tag => (
            <EuiFlexItem key={tag.id} grow={false}>
              <ConnectedLink path={`/tag/edit/${tag.id}`}>
                <TagBadge tag={tag} />
              </ConnectedLink>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      ),
      sortable: false,
    },
    {
      // TODO: update to use actual metadata field
      field: 'config_status',
      name: 'Config Status',
      render: (value: string, beat: CMPopulatedBeat) => {
        let color: IconColor = 'success';
        let statusText = 'OK';
        let tooltipText = 'Beat successfully applied latest config';

        switch (beat.config_status) {
          case 'UNKNOWN':
            color = 'subdued';
            statusText = 'Offline';
            if (moment().diff(beat.last_checkin, 'minutes') >= 10) {
              tooltipText = 'This Beat has not connected to kibana in over 10min';
            } else {
              tooltipText = 'This Beat has not yet been started.';
            }
            break;
          case 'ERROR':
            color = 'danger';
            statusText = 'Error';
            tooltipText = 'Please check the logs of this Beat for error details';
            break;
        }

        return (
          <EuiFlexGroup wrap responsive={true} gutterSize="xs">
            <EuiToolTip content={tooltipText}>
              <EuiHealth color={color}>{statusText}</EuiHealth>
            </EuiToolTip>
          </EuiFlexGroup>
        );
      },
      sortable: false,
    },
    {
      field: 'full_tags',
      name: 'Last config update',
      render: (tags: BeatTag[]) =>
        tags.length ? (
          <span>
            {moment(first(sortByOrder(tags, ['last_updated'], ['desc'])).last_updated).fromNow()}
          </span>
        ) : null,
      sortable: true,
    },
  ],
  controlDefinitions: (data: any[]) => ({
    actions: [
      {
        name: 'Disenroll Selected',
        action: 'delete',
        danger: true,
      },
    ],
    filters: [
      {
        type: 'field_value_selection',
        field: 'type',
        name: 'Type',
        options: uniq(data.map(({ type }: { type: any }) => ({ value: type })), 'value'),
      },
    ],
  }),
};

export const TagsTableType: TableType = {
  columnDefinitions: [
    {
      field: 'id',
      name: 'Tag name',
      render: (id: string, tag: BeatTag) => (
        <ConnectedLink path={`/tag/edit/${tag.id}`}>
          <TagBadge tag={tag} />
        </ConnectedLink>
      ),
      sortable: true,
      width: '45%',
    },
    {
      align: 'right',
      field: 'configuration_blocks',
      name: 'Configurations',
      render: (configurationBlocks: ConfigurationBlock[]) => (
        <div>{configurationBlocks.length}</div>
      ),
      sortable: false,
    },
    {
      align: 'right',
      field: 'last_updated',
      name: 'Last update',
      render: (lastUpdate: Date) => <div>{moment(lastUpdate).fromNow()}</div>,
      sortable: true,
    },
  ],
  controlDefinitions: (data: any) => ({
    actions: [
      {
        name: 'Remove Selected',
        action: 'delete',
        danger: true,
      },
    ],
    filters: [],
  }),
};

export const BeatDetailTagsTable: TableType = {
  columnDefinitions: [
    {
      field: 'id',
      name: 'Tag name',
      render: (id: string, tag: BeatTag) => (
        <ConnectedLink path={`/tag/edit/${tag.id}`}>
          <TagBadge tag={tag} />
        </ConnectedLink>
      ),
      sortable: true,
      width: '55%',
    },
    {
      align: 'right',
      field: 'configuration_blocks',
      name: 'Configurations',
      render: (configurations: ConfigurationBlock[]) => <span>{configurations.length}</span>,
      sortable: true,
    },
    {
      align: 'right',
      field: 'last_updated',
      name: 'Last update',
      render: (lastUpdate: string) => <span>{moment(lastUpdate).fromNow()}</span>,
      sortable: true,
    },
  ],
  controlDefinitions: (data: any) => ({
    actions: [],
    filters: [],
    primaryActions: [
      {
        name: 'Add Tag',
        action: 'add',
        danger: false,
      },
      {
        name: 'Remove Selected',
        action: 'remove',
        danger: true,
      },
    ],
  }),
};
