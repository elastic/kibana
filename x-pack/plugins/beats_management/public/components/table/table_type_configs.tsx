/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiBadge, EuiFlexGroup, EuiIcon, EuiLink } from '@elastic/eui';
import { flatten, uniq } from 'lodash';
import moment from 'moment';
import React from 'react';

import { TABLE_CONFIG } from '../../../common/constants';
import { BeatTag, CMPopulatedBeat, ConfigurationBlock } from '../../../common/domain_types';

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
}

export interface TableType {
  columnDefinitions: ColumnDefinition[];
  controlDefinitions(items: any[]): ControlDefinitions;
}

export const BeatsTableType: TableType = {
  columnDefinitions: [
    {
      field: 'id',
      name: 'Beat name',
      render: (id: string) => <EuiLink>{id}</EuiLink>,
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
        <EuiFlexGroup wrap responsive={true}>
          {(beat.full_tags || []).map(tag => (
            <EuiBadge key={tag.id} color={tag.color ? tag.color : 'primary'}>
              {tag.id}
            </EuiBadge>
          ))}
        </EuiFlexGroup>
      ),
      sortable: false,
    },
    {
      // TODO: update to use actual metadata field
      field: 'event_rate',
      name: 'Event rate',
      sortable: true,
    },
    {
      // TODO: update to use actual metadata field
      field: 'last_updated',
      name: 'Last config update',
      render: (value: Date) => <div>{moment(value).fromNow()}</div>,
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
      {
        type: 'field_value_selection',
        field: 'full_tags',
        name: 'Tags',
        options: uniq(
          flatten(data.map((item: any) => item.full_tags || [])).map((tag: any) => ({
            value: tag.id,
          })),
          'value'
        ),
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
        <EuiBadge color={tag.color ? tag.color : 'primary'}>
          {tag.id.length > TABLE_CONFIG.TRUNCATE_TAG_LENGTH
            ? `${tag.id.substring(0, TABLE_CONFIG.TRUNCATE_TAG_LENGTH)}...`
            : tag.id}
        </EuiBadge>
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
    actions: [],
    filters: [],
  }),
};
