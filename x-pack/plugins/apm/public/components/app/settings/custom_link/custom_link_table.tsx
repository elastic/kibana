/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import React, { useState } from 'react';
import { CustomLink } from '../../../../../common/custom_link/custom_link_types';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { LoadingStatePrompt } from '../../../shared/loading_state_prompt';
import { ITableColumn, ManagedTable } from '../../../shared/managed_table';
import { TimestampTooltip } from '../../../shared/timestamp_tooltip';

interface Props {
  items: CustomLink[];
  onCustomLinkSelected: (customLink: CustomLink) => void;
}

export function CustomLinkTable({ items = [], onCustomLinkSelected }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const { core } = useApmPluginContext();
  const canSave = core.application.capabilities.apm.save;

  const columns: Array<ITableColumn<CustomLink>> = [
    {
      field: 'label',
      name: i18n.translate('xpack.apm.settings.customLink.table.name', {
        defaultMessage: 'Name',
      }),
      truncateText: true,
    },
    {
      field: 'url',
      name: i18n.translate('xpack.apm.settings.customLink.table.url', {
        defaultMessage: 'URL',
      }),
      truncateText: true,
    },
    {
      width: '160px',
      align: RIGHT_ALIGNMENT,
      field: '@timestamp',
      name: i18n.translate('xpack.apm.settings.customLink.table.lastUpdated', {
        defaultMessage: 'Last updated',
      }),
      sortable: true,
      render: (value: number) => (
        <TimestampTooltip time={value} timeUnit="minutes" />
      ),
    },
    {
      width: '48px',
      name: '',
      actions: [
        ...(canSave
          ? [
              {
                name: i18n.translate(
                  'xpack.apm.settings.customLink.table.editButtonLabel',
                  { defaultMessage: 'Edit' }
                ),
                description: i18n.translate(
                  'xpack.apm.settings.customLink.table.editButtonDescription',
                  { defaultMessage: 'Edit this custom link' }
                ),
                icon: 'pencil',
                color: 'primary',
                type: 'icon',
                'data-test-subj': 'editCustomLink',
                onClick: (customLink: CustomLink) => {
                  onCustomLinkSelected(customLink);
                },
              },
            ]
          : []),
      ],
    },
  ];

  const filteredItems = items.filter(({ label, url }) => {
    return (
      label.toLowerCase().includes(searchTerm) ||
      url.toLowerCase().includes(searchTerm)
    );
  });

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFieldSearch
        fullWidth
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={i18n.translate(
          'xpack.apm.settings.customLink.searchInput.filter',
          {
            defaultMessage: 'Filter links by Name and URL...',
          }
        )}
      />
      <EuiSpacer size="s" />
      <ManagedTable
        noItemsMessage={
          isEmpty(items) ? (
            <LoadingStatePrompt />
          ) : (
            <NoResultFound value={searchTerm} />
          )
        }
        items={filteredItems}
        columns={columns}
        initialSortField="@timestamp"
        initialSortDirection="desc"
      />
    </>
  );
}

function NoResultFound({ value }: { value: string }) {
  return (
    <EuiFlexGroup justifyContent="spaceAround">
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          {i18n.translate('xpack.apm.settings.customLink.table.noResultFound', {
            defaultMessage: `No results for "{value}".`,
            values: { value },
          })}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
