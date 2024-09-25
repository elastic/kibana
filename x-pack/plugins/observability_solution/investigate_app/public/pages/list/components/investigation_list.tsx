/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  Criteria,
  EuiAvatar,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { InvestigationResponse } from '@kbn/investigation-shared/src/rest_specs/investigation';
import moment from 'moment';
import React, { useState } from 'react';
import { paths } from '../../../../common/paths';
import { InvestigationStatusBadge } from '../../../components/investigation_status_badge/investigation_status_badge';
import { InvestigationTag } from '../../../components/investigation_tag/investigation_tag';
import { useFetchInvestigationList } from '../../../hooks/use_fetch_investigation_list';
import { useFetchUserProfiles } from '../../../hooks/use_fetch_user_profiles';
import { useKibana } from '../../../hooks/use_kibana';
import { InvestigationListActions } from './investigation_list_actions';
import { InvestigationStats } from './investigation_stats';
import { InvestigationsError } from './investigations_error';
import { SearchBar } from './search_bar/search_bar';

export function InvestigationList() {
  const {
    core: {
      http: { basePath },
      uiSettings,
    },
  } = useKibana();
  const dateFormat = uiSettings.get('dateFormat');
  const tz = uiSettings.get('dateFormat:tz');

  const [pageIndex, setPageIndex] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [search, setSearch] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  const { data, isLoading, isError } = useFetchInvestigationList({
    page: pageIndex + 1,
    perPage: pageSize,
    search,
    filter: toFilter(status, tags),
  });

  const { data: userProfiles, isLoading: isUserProfilesLoading } = useFetchUserProfiles({
    profileIds: new Set(data?.results.map((i) => i.createdBy)),
  });

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
      render: (value: InvestigationResponse['createdBy']) => {
        return isUserProfilesLoading ? (
          <EuiLoadingSpinner size="m" />
        ) : (
          <EuiFlexGroup gutterSize="s" direction="row">
            <EuiAvatar
              name={
                userProfiles?.[value]?.user.full_name ??
                userProfiles?.[value]?.user.username ??
                value
              }
              size="s"
            />
            <EuiText size="s">
              {userProfiles?.[value]?.user.full_name ??
                userProfiles?.[value]?.user.username ??
                value}
            </EuiText>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'tags',
      name: i18n.translate('xpack.investigateApp.investigationList.tagsLabel', {
        defaultMessage: 'Tags',
      }),
      render: (value: InvestigationResponse['tags']) => {
        return (
          <EuiFlexGroup wrap gutterSize="xs">
            {value.map((tag) => (
              <InvestigationTag key={tag} tag={tag} />
            ))}
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'notes',
      name: i18n.translate('xpack.investigateApp.investigationList.notesLabel', {
        defaultMessage: 'Comments',
      }),
      render: (notes: InvestigationResponse['notes']) => <span>{notes?.length || 0}</span>,
    },
    {
      field: 'updatedAt',
      name: i18n.translate('xpack.investigateApp.investigationList.updatedAtLabel', {
        defaultMessage: 'Updated at',
      }),
      render: (updatedAt: InvestigationResponse['updatedAt']) => (
        <span>{moment(updatedAt).tz(tz).format(dateFormat)}</span>
      ),
    },
    {
      field: 'status',
      name: 'Status',
      render: (s: InvestigationResponse['status']) => {
        return <InvestigationStatusBadge status={s} />;
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
    pageSizeOptions: [10, 25, 50, 100],
    showPerPageOptions: true,
  };

  const resultsCount =
    pageSize === 0
      ? i18n.translate('xpack.investigateApp.investigationList.allLabel', {
          defaultMessage: 'Showing All',
        })
      : i18n.translate('xpack.investigateApp.investigationList.showingLabel', {
          defaultMessage: 'Showing {startItem}-{endItem} of {totalItemCount}',
          values: {
            startItem: pageSize * pageIndex + 1,
            endItem: pageSize * pageIndex + pageSize,
            totalItemCount,
          },
        });

  const onTableChange = ({ page }: Criteria<InvestigationResponse>) => {
    if (page) {
      const { index, size } = page;
      setPageIndex(index);
      setPageSize(size);
    }
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <InvestigationStats />
      <SearchBar
        isLoading={isLoading}
        onSearch={(value) => setSearch(value)}
        onStatusFilterChange={(selected) => setStatus(selected)}
        onTagsFilterChange={(selected) => setTags(selected)}
      />
      <EuiFlexGroup direction="column" gutterSize="s">
        {isLoading && <EuiLoadingSpinner size="xl" />}
        {isError && <InvestigationsError />}
        {!isLoading && !isError && (
          <>
            <EuiText size="xs">{resultsCount}</EuiText>
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
          </>
        )}
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}

function toFilter(status: string[], tags: string[]) {
  const statusFitler = status.map((s) => `investigation.attributes.status:${s}`).join(' OR ');
  const tagsFilter = tags.map((tag) => `investigation.attributes.tags:${tag}`).join(' OR ');

  if (statusFitler && tagsFilter) {
    return `(${statusFitler}) AND (${tagsFilter})`;
  }
  if (statusFitler) {
    return statusFitler;
  }

  if (tagsFilter) {
    return tagsFilter;
  }
}
