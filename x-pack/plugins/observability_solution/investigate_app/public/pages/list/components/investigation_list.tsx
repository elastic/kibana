/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  Criteria,
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiLink,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { InvestigationResponse } from '@kbn/investigation-shared/src/rest_specs/investigation';
import moment from 'moment';
import React, { useState } from 'react';
import { paths } from '../../../../common/paths';
import { InvestigationNotFound } from '../../../components/investigation_not_found/investigation_not_found';
import { InvestigationStatusBadge } from '../../../components/investigation_status_badge/investigation_status_badge';
import { useFetchInvestigationList } from '../../../hooks/use_fetch_investigation_list';
import { useKibana } from '../../../hooks/use_kibana';
import { InvestigationListActions } from './investigation_list_actions';

export function InvestigationList() {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const {
    core: {
      http: { basePath },
      uiSettings,
    },
  } = useKibana();
  const { data, isLoading, isError } = useFetchInvestigationList({
    page: pageIndex + 1,
    perPage: pageSize,
  });
  const dateFormat = uiSettings.get('dateFormat');
  const tz = uiSettings.get('dateFormat:tz');

  if (isLoading) {
    return <EuiLoadingSpinner size="xl" />;
  }

  if (isError) {
    return <InvestigationNotFound />;
  }

  const investigations = data?.results ?? [];
  const totalItemCount = data?.total ?? 0;

  const columns: Array<EuiBasicTableColumn<InvestigationResponse>> = [
    {
      field: 'title',
      name: i18n.translate('xpack.investigateApp.investigationList.titleLabel', {
        defaultMessage: 'Name',
      }),
      render: (title: InvestigationResponse['title'], investigation: InvestigationResponse) => {
        return (
          <EuiLink
            data-test-subj="investigateAppInvestigationListDirectLink"
            href={basePath.prepend(paths.investigationDetails(investigation.id))}
          >
            {title}
          </EuiLink>
        );
      },
    },
    {
      field: 'createdBy',
      name: i18n.translate('xpack.investigateApp.investigationList.createdByLabel', {
        defaultMessage: 'Created by',
      }),
      truncateText: true,
    },
    {
      field: 'notes',
      name: i18n.translate('xpack.investigateApp.investigationList.notesLabel', {
        defaultMessage: 'Comments',
      }),
      render: (notes: InvestigationResponse['notes']) => <span>{notes?.length || 0}</span>,
    },
    {
      field: 'createdAt',
      name: i18n.translate('xpack.investigateApp.investigationList.createdAtLabel', {
        defaultMessage: 'Created at',
      }),
      render: (createdAt: InvestigationResponse['createdAt']) => (
        <span>{moment(createdAt).tz(tz).format(dateFormat)}</span>
      ),
    },
    {
      field: 'status',
      name: 'Status',
      render: (status: InvestigationResponse['status']) => {
        return <InvestigationStatusBadge status={status} />;
      },
    },
    {
      field: 'tags',
      name: 'Tags',
      render: (tags: InvestigationResponse['tags']) => {
        return tags.map((tag) => (
          <EuiBadge color={'default'} key="tag">
            {tag}
          </EuiBadge>
        ));
      },
    },
    {
      name: 'Actions',
      render: (investigation: InvestigationResponse) => (
        <InvestigationListActions investigation={investigation} />
      ),
    },
  ];

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount,
    pageSizeOptions: [10, 50],
    showPerPageOptions: true,
  };

  const onTableChange = ({ page }: Criteria<InvestigationResponse>) => {
    if (page) {
      const { index, size } = page;
      setPageIndex(index);
      setPageSize(size);
    }
  };

  return (
    <EuiBasicTable
      tableCaption={i18n.translate('xpack.investigateApp.investigationList.tableCaption', {
        defaultMessage: 'Investigations List',
      })}
      items={investigations}
      pagination={pagination}
      rowHeader="title"
      columns={columns}
      onChange={onTableChange}
    />
  );
}
