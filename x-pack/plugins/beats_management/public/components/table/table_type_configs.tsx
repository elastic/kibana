/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiToolTip, IconColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { sortBy, uniq } from 'lodash';
import moment from 'moment';
import React from 'react';
import { BeatTag, CMBeat } from '../../../common/domain_types';
import { ConnectedLink } from '../navigation/connected_link';
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
  itemType: 'Beats' | 'Tags';
  columnDefinitions: ColumnDefinition[];
  controlDefinitions(items: any[]): ControlDefinitions;
}

export const BeatsTableType: TableType = {
  itemType: 'Beats',
  columnDefinitions: [
    {
      field: 'name',
      name: i18n.translate('xpack.beatsManagement.beatsTable.beatNameTitle', {
        defaultMessage: 'Beat name',
      }),
      render: (name: string, beat: CMBeat) => (
        <ConnectedLink path={`/beat/${beat.id}/details`}>{name}</ConnectedLink>
      ),
      sortable: true,
    },
    {
      field: 'type',
      name: i18n.translate('xpack.beatsManagement.beatsTable.typeTitle', {
        defaultMessage: 'Type',
      }),
      sortable: true,
    },
    {
      field: 'full_tags',
      name: i18n.translate('xpack.beatsManagement.beatsTable.tagsTitle', {
        defaultMessage: 'Tags',
      }),
      render: (value: string, beat: CMBeat & { tags: BeatTag[] }) => (
        <EuiFlexGroup wrap responsive={true} gutterSize="xs">
          {(sortBy(beat.tags, 'id') || []).map(tag => (
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
      field: 'config_status',
      name: i18n.translate('xpack.beatsManagement.beatsTable.configStatusTitle', {
        defaultMessage: 'Config Status',
      }),
      render: (value: string, beat: CMBeat) => {
        let color: IconColor = 'success';
        let statusText = i18n.translate('xpack.beatsManagement.beatsTable.configStatus.okLabel', {
          defaultMessage: 'OK',
        });
        let tooltipText = i18n.translate(
          'xpack.beatsManagement.beatsTable.configStatus.okTooltip',
          {
            defaultMessage: 'Beat successfully applied latest config',
          }
        );

        switch (beat.config_status) {
          case 'UNKNOWN':
            color = 'subdued';
            statusText = i18n.translate(
              'xpack.beatsManagement.beatsTable.configStatus.offlineLabel',
              {
                defaultMessage: 'Offline',
              }
            );
            if (moment().diff(beat.last_checkin, 'minutes') >= 10) {
              tooltipText = i18n.translate(
                'xpack.beatsManagement.beatsTable.configStatus.noConnectionTooltip',
                {
                  defaultMessage: 'This Beat has not connected to kibana in over 10min',
                }
              );
            } else {
              tooltipText = i18n.translate(
                'xpack.beatsManagement.beatsTable.configStatus.notStartedTooltip',
                {
                  defaultMessage: 'This Beat has not yet been started.',
                }
              );
            }
            break;
          case 'ERROR':
            color = 'danger';
            statusText = i18n.translate(
              'xpack.beatsManagement.beatsTable.configStatus.errorLabel',
              {
                defaultMessage: 'Error',
              }
            );
            tooltipText = i18n.translate(
              'xpack.beatsManagement.beatsTable.configStatus.errorTooltip',
              {
                defaultMessage: 'Please check the logs of this Beat for error details',
              }
            );
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
    // {
    //   field: 'full_tags',
    //   name: i18n.translate('xpack.beatsManagement.beatsTable.lastConfigUpdateTitle', {
    //     defaultMessage: 'Last config update',
    //   }),
    //   render: (tags?: BeatTag[]) =>
    //     tags && tags.length ? (
    //       <span>
    //         {moment(first(sortByOrder(tags, ['last_updated'], ['desc'])).last_updated).fromNow()}
    //       </span>
    //     ) : null,
    //   sortable: true,
    // },
  ],
  controlDefinitions: (data: any[]) => ({
    actions: [
      {
        name: i18n.translate('xpack.beatsManagement.beatsTable.disenrollSelectedLabel', {
          defaultMessage: 'Unenroll Selected',
        }),
        action: 'delete',
        danger: true,
      },
    ],
    filters: [
      {
        type: 'field_value_selection',
        field: 'type',
        name: i18n.translate('xpack.beatsManagement.beatsTable.typeLabel', {
          defaultMessage: 'Type',
        }),
        options: uniq(data.map(({ type }: { type: any }) => ({ value: type })), 'value'),
      },
    ],
  }),
};

export const TagsTableType: TableType = {
  itemType: 'Tags',
  columnDefinitions: [
    {
      field: 'id',
      name: i18n.translate('xpack.beatsManagement.tagsTable.tagNameTitle', {
        defaultMessage: 'Tag name',
      }),
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
      field: 'last_updated',
      name: i18n.translate('xpack.beatsManagement.tagsTable.lastUpdateTitle', {
        defaultMessage: 'Last update',
      }),
      render: (lastUpdate: Date) => <div>{moment(lastUpdate).fromNow()}</div>,
      sortable: true,
    },
  ],
  controlDefinitions: (data: any) => ({
    actions: [
      {
        name: i18n.translate('xpack.beatsManagement.tagsTable.removeSelectedLabel', {
          defaultMessage: 'Remove Selected',
        }),
        action: 'delete',
        danger: true,
      },
    ],
    filters: [],
  }),
};

export const BeatDetailTagsTable: TableType = {
  itemType: 'Tags',
  columnDefinitions: [
    {
      field: 'id',
      name: i18n.translate('xpack.beatsManagement.beatTagsTable.tagNameTitle', {
        defaultMessage: 'Tag name',
      }),
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
      field: 'last_updated',
      name: i18n.translate('xpack.beatsManagement.beatTagsTable.lastUpdateTitle', {
        defaultMessage: 'Last update',
      }),
      render: (lastUpdate: string) => <span>{moment(lastUpdate).fromNow()}</span>,
      sortable: true,
    },
  ],
  controlDefinitions: (data: any) => ({
    actions: [],
    filters: [],
    primaryActions: [
      {
        name: i18n.translate('xpack.beatsManagement.beatTagsTable.addTagLabel', {
          defaultMessage: 'Add Tag',
        }),
        action: 'add',
        danger: false,
      },
      {
        name: i18n.translate('xpack.beatsManagement.beatTagsTable.removeSelectedLabel', {
          defaultMessage: 'Remove Selected',
        }),
        action: 'remove',
        danger: true,
      },
    ],
  }),
};
