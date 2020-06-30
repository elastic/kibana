/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { isEmpty } from 'lodash';
import { CustomLink } from '../../../../../../common/custom_link/custom_link_types';
import { units, px } from '../../../../../style/variables';
import { ManagedTable } from '../../../../shared/ManagedTable';
import { TimestampTooltip } from '../../../../shared/TimestampTooltip';
import { LoadingStatePrompt } from '../../../../shared/LoadingStatePrompt';

interface Props {
  items: CustomLink[];
  onCustomLinkSelected: (customLink: CustomLink) => void;
}

export const CustomLinkTable = ({
  items = [],
  onCustomLinkSelected,
}: Props) => {
  const [searchTerm, setSearchTerm] = useState('');

  const columns = [
    {
      field: 'label',
      name: i18n.translate(
        'xpack.apm.settings.customizeUI.customLink.table.name',
        { defaultMessage: 'Name' }
      ),
      truncateText: true,
    },
    {
      field: 'url',
      name: i18n.translate(
        'xpack.apm.settings.customizeUI.customLink.table.url',
        { defaultMessage: 'URL' }
      ),
      truncateText: true,
    },
    {
      width: px(160),
      align: 'right',
      field: '@timestamp',
      name: i18n.translate(
        'xpack.apm.settings.customizeUI.customLink.table.lastUpdated',
        { defaultMessage: 'Last updated' }
      ),
      sortable: true,
      render: (value: number) => (
        <TimestampTooltip time={value} timeUnit="minutes" />
      ),
    },
    {
      width: px(units.triple),
      name: '',
      actions: [
        {
          name: i18n.translate(
            'xpack.apm.settings.customizeUI.customLink.table.editButtonLabel',
            { defaultMessage: 'Edit' }
          ),
          description: i18n.translate(
            'xpack.apm.settings.customizeUI.customLink.table.editButtonDescription',
            { defaultMessage: 'Edit this custom link' }
          ),
          icon: 'pencil',
          color: 'primary',
          type: 'icon',
          onClick: (customLink: CustomLink) => {
            onCustomLinkSelected(customLink);
          },
        },
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
          'xpack.apm.settings.customizeUI.customLink.searchInput.filter',
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
        initialPageSize={10}
        initialSortField="@timestamp"
        initialSortDirection="desc"
      />
    </>
  );
};

const NoResultFound = ({ value }: { value: string }) => (
  <EuiFlexGroup justifyContent="spaceAround">
    <EuiFlexItem grow={false}>
      <EuiText size="s">
        {i18n.translate(
          'xpack.apm.settings.customizeUI.customLink.table.noResultFound',
          {
            defaultMessage: `No results for "{value}".`,
            values: { value },
          }
        )}
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);
