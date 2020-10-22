/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useCallback, useState, useMemo, FC } from 'react';
import useMount from 'react-use/lib/useMount';
import { EuiPageContent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ChromeBreadcrumb, CoreStart } from 'src/core/public';
import { TagWithRelations, TagsCapabilities } from '../../common';
import { getCreateModalOpener, getEditModalOpener } from '../components/edition_modal';
import { ITagInternalClient } from '../tags';
import { Header, TagTable } from './components';
import { getTagConnectionsUrl } from './utils';

interface TagManagementPageParams {
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  core: CoreStart;
  tagClient: ITagInternalClient;
  capabilities: TagsCapabilities;
}

export const TagManagementPage: FC<TagManagementPageParams> = ({
  setBreadcrumbs,
  core,
  tagClient,
  capabilities,
}) => {
  const { overlays, notifications, application, http } = core;
  const [loading, setLoading] = useState<boolean>(false);
  const [allTags, setAllTags] = useState<TagWithRelations[]>([]);
  const [selectedTags, setSelectedTags] = useState<TagWithRelations[]>([]);

  const createModalOpener = useMemo(() => getCreateModalOpener({ overlays, tagClient }), [
    overlays,
    tagClient,
  ]);
  const editModalOpener = useMemo(() => getEditModalOpener({ overlays, tagClient }), [
    overlays,
    tagClient,
  ]);

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
    createModalOpener({
      onCreate: (createdTag) => {
        fetchTags();
        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.savedObjectsTagging.notifications.createTagSuccessTitle', {
            defaultMessage: 'Created "{name}" tag',
            values: {
              name: createdTag.name,
            },
          }),
        });
      },
    });
  }, [notifications, createModalOpener, fetchTags]);

  const openEditModal = useCallback(
    (tag: TagWithRelations) => {
      editModalOpener({
        tagId: tag.id,
        onUpdate: (updatedTag) => {
          fetchTags();
          notifications.toasts.addSuccess({
            title: i18n.translate('xpack.savedObjectsTagging.notifications.editTagSuccessTitle', {
              defaultMessage: 'Saved changes to "{name}" tag',
              values: {
                name: updatedTag.name,
              },
            }),
          });
        },
      });
    },
    [notifications, editModalOpener, fetchTags]
  );

  const getTagRelationUrl = useCallback(
    (tag: TagWithRelations) => {
      return getTagConnectionsUrl(tag, http.basePath);
    },
    [http]
  );

  const showTagRelations = useCallback(
    (tag: TagWithRelations) => {
      application.navigateToUrl(getTagRelationUrl(tag));
    },
    [application, getTagRelationUrl]
  );

  const deleteTagWithConfirm = useCallback(
    async (tag: TagWithRelations) => {
      const confirmed = await overlays.openConfirm(
        i18n.translate('xpack.savedObjectsTagging.modals.confirmDelete.text', {
          defaultMessage:
            'By deleting this tag, you will no longer be able to assign it to saved objects. ' +
            'This tag will be removed from any saved objects that currently use it. ' +
            'Are you sure you wish to proceed?',
        }),
        {
          title: i18n.translate('xpack.savedObjectsTagging.modals.confirmDelete.title', {
            defaultMessage: 'Delete "{name}" tag',
            values: {
              name: tag.name,
            },
          }),
          confirmButtonText: i18n.translate(
            'xpack.savedObjectsTagging.modals.confirmDelete.confirmButtonText',
            {
              defaultMessage: 'Delete tag',
            }
          ),
          buttonColor: 'danger',
        }
      );
      if (confirmed) {
        await tagClient.delete(tag.id);

        fetchTags();

        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.savedObjectsTagging.notifications.deleteTagSuccessTitle', {
            defaultMessage: 'Deleted "{name}" tag',
            values: {
              name: tag.name,
            },
          }),
        });
      }
    },
    [overlays, notifications, fetchTags, tagClient]
  );

  return (
    <EuiPageContent horizontalPosition="center">
      <Header canCreate={capabilities.create} onCreate={openCreateModal} />
      <TagTable
        loading={loading}
        tags={allTags}
        capabilities={capabilities}
        selectedTags={selectedTags}
        onSelectionChange={(tags) => {
          setSelectedTags(tags);
        }}
        onEdit={(tag) => {
          openEditModal(tag);
        }}
        onDelete={(tag) => {
          deleteTagWithConfirm(tag);
        }}
        getTagRelationUrl={getTagRelationUrl}
        onShowRelations={(tag) => {
          showTagRelations(tag);
        }}
      />
    </EuiPageContent>
  );
};
