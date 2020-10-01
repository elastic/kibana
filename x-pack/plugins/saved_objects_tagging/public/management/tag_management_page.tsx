/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useCallback, useState, FC } from 'react';
import useMount from 'react-use/lib/useMount';
import { EuiPageContent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ChromeBreadcrumb, OverlayStart } from 'src/core/public';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';
import { TagWithRelations } from '../../common/types';
import { ITagInternalClient } from '../tags';
import { Header, TagTable, CreateOrEditModal } from './components';

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
  const [allTags, setAllTags] = useState<TagWithRelations[]>([]);
  const [selectedTags, setSelectedTags] = useState<TagWithRelations[]>([]);

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

  const fetchTags = useCallback(async () => {
    setLoading(true);
    const { tags } = await tagClient.find({
      page: 1,
      perPage: 10000,
    });
    setAllTags(tags);
    setLoading(false);
  }, [tagClient]);

  useMount(() => {
    fetchTags();
  });

  const openCreateModal = useCallback(() => {
    const modal = overlays.openModal(
      toMountPoint(
        <CreateOrEditModal
          onClose={() => {
            modal.close();
          }}
          onCreate={(tag) => {
            fetchTags();
            modal.close();
          }}
          tagClient={tagClient}
        />
      )
    );
  }, [overlays, tagClient, fetchTags]);

  const openEditModal = useCallback(
    (tag: TagWithRelations) => {
      // console.log('openEditModal', tag);
    },
    [
      /* overlays, tagClient */
    ]
  );

  return (
    <EuiPageContent horizontalPosition="center">
      <Header onCreate={openCreateModal} />
      <TagTable
        loading={loading}
        tags={allTags}
        selectedTags={selectedTags}
        onSelectionChange={(tags) => {
          setSelectedTags(tags);
        }}
        onEdit={(tag) => {
          openEditModal(tag);
        }}
      />
    </EuiPageContent>
  );
};
