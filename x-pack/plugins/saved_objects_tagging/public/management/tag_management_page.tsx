/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useCallback, useState, FC } from 'react';
import { EuiPageContent, Query } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ChromeBreadcrumb, OverlayStart } from 'src/core/public';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';
import { TagSavedObjectWithRelations } from '../../common/types';
import { ITagInternalClient } from '../tags';
import { Header, SearchBar, TagTable, CreateOrEditModal } from './components';
import { PaginationState } from './types';

interface TagManagementPageParams {
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  overlays: OverlayStart;
  tagClient: ITagInternalClient;
}

export const TagManagementPage: FC<TagManagementPageParams> = ({
  setBreadcrumbs,
  overlays,
  tagClient,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState<PaginationState>({ pageNumber: 0, pageSize: 50 });
  const [displayedTags, setDisplayedTags] = useState<TagSavedObjectWithRelations[]>([]);
  const [totalTags, setTotalTags] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<TagSavedObjectWithRelations[]>([]);

  useEffect(() => {
    setBreadcrumbs([
      {
        text: i18n.translate('xpack.savedObjectsTagging.management.breadcrumb.index', {
          defaultMessage: 'Tags',
        }),
        href: '/',
      },
    ]);
  }, [setBreadcrumbs]);

  const fetchTags = async () => {
    // TODO: cancel pending request if any.
    setLoading(true);
    const { tags, total } = await tagClient.find({
      page: pagination.pageNumber + 1,
      perPage: pagination.pageSize,
      search: '', // TODO: wire,
    });
    setDisplayedTags(tags);
    setTotalTags(total);

    setLoading(false);
  };

  useEffect(() => {
    fetchTags();
  }, [pagination, tagClient]); // eslint-disable-line

  const onQueryChange = useCallback((query: Query) => {}, []);

  const onPaginationChange = useCallback((newPagination: PaginationState) => {
    setPagination(newPagination);
    setSelectedTags([]);
  }, []);

  const openCreateModal = useCallback(() => {
    const modal = overlays.openModal(
      toMountPoint(
        <CreateOrEditModal
          onClose={() => {
            modal.close();
          }}
          onCreate={(tag) => {
            modal.close();
          }}
          tagClient={tagClient}
        />
      )
    );
  }, [overlays, tagClient]);

  return (
    <EuiPageContent horizontalPosition="center">
      <Header onCreate={openCreateModal} />
      <SearchBar onChange={onQueryChange} />
      <TagTable
        loading={loading}
        totalTags={totalTags}
        tags={displayedTags}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
        onSelectionChange={setSelectedTags}
      />
    </EuiPageContent>
  );
};
