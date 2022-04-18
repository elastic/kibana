/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useCallback, useState, useMemo, FC } from 'react';
import { Subject } from 'rxjs';
import useMount from 'react-use/lib/useMount';
import { Query } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ChromeBreadcrumb, CoreStart } from '@kbn/core/public';
import { EuiSpacer } from '@elastic/eui';
import { TagWithRelations, TagsCapabilities } from '../../common';
import { getCreateModalOpener } from '../components/edition_modal';
import { ITagInternalClient, ITagAssignmentService, ITagsCache } from '../services';
import { TagBulkAction } from './types';
import { Header, TagTable, ActionBar } from './components';
import { getTableActions } from './actions';
import { getBulkActions } from './bulk_actions';
import { getTagConnectionsUrl } from './utils';

interface TagManagementPageParams {
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  core: CoreStart;
  tagClient: ITagInternalClient;
  tagCache: ITagsCache;
  assignmentService: ITagAssignmentService;
  capabilities: TagsCapabilities;
  assignableTypes: string[];
}

export const TagManagementPage: FC<TagManagementPageParams> = ({
  setBreadcrumbs,
  core,
  tagClient,
  tagCache,
  assignmentService,
  capabilities,
  assignableTypes,
}) => {
  const { overlays, notifications, application, http, theme } = core;
  const [loading, setLoading] = useState<boolean>(false);
  const [allTags, setAllTags] = useState<TagWithRelations[]>([]);
  const [selectedTags, setSelectedTags] = useState<TagWithRelations[]>([]);
  const [query, setQuery] = useState<Query | undefined>();

  const filteredTags = useMemo(() => {
    return query ? Query.execute(query, allTags) : allTags;
  }, [allTags, query]);

  const unmount$ = useMemo(() => {
    return new Subject<void>();
  }, []);

  useEffect(() => {
    return () => {
      unmount$.next();
    };
  }, [unmount$]);

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

  const createModalOpener = useMemo(
    () => getCreateModalOpener({ overlays, theme, tagClient }),
    [overlays, theme, tagClient]
  );

  const tableActions = useMemo(() => {
    return getTableActions({
      core,
      capabilities,
      tagClient,
      tagCache,
      assignmentService,
      setLoading,
      assignableTypes,
      fetchTags,
      canceled$: unmount$,
    });
  }, [
    core,
    capabilities,
    tagClient,
    tagCache,
    assignmentService,
    setLoading,
    assignableTypes,
    fetchTags,
    unmount$,
  ]);

  const bulkActions = useMemo(() => {
    return getBulkActions({
      core,
      capabilities,
      tagClient,
      tagCache,
      assignmentService,
      setLoading,
      assignableTypes,
      clearSelection: () => setSelectedTags([]),
    });
  }, [core, capabilities, tagClient, tagCache, assignmentService, assignableTypes]);

  useEffect(() => {
    setBreadcrumbs([
      {
        text: i18n.translate('xpack.savedObjectsTagging.management.breadcrumb.index', {
          defaultMessage: 'Tags',
        }),
      },
    ]);
  }, [setBreadcrumbs]);

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

  const executeBulkAction = useCallback(
    async (action: TagBulkAction) => {
      try {
        await action.execute(
          selectedTags.map(({ id }) => id),
          { canceled$: unmount$ }
        );
      } catch (e) {
        notifications.toasts.addError(e, {
          title: i18n.translate('xpack.savedObjectsTagging.notifications.bulkActionError', {
            defaultMessage: 'An error occurred',
          }),
        });
      } finally {
        setLoading(false);
      }
      if (action.refreshAfterExecute) {
        await fetchTags();
      }
    },
    [selectedTags, fetchTags, notifications, unmount$]
  );

  const actionBar = useMemo(
    () => (
      <ActionBar
        actions={bulkActions}
        totalCount={filteredTags.length}
        selectedCount={selectedTags.length}
        onActionSelected={executeBulkAction}
      />
    ),
    [selectedTags, filteredTags, bulkActions, executeBulkAction]
  );

  return (
    <>
      <Header canCreate={capabilities.create} onCreate={openCreateModal} />
      <EuiSpacer size="l" />
      <TagTable
        loading={loading}
        tags={filteredTags}
        capabilities={capabilities}
        actionBar={actionBar}
        actions={tableActions}
        initialQuery={query}
        onQueryChange={(newQuery) => {
          setQuery(newQuery);
          setSelectedTags([]);
        }}
        allowSelection={bulkActions.length > 0}
        selectedTags={selectedTags}
        onSelectionChange={(tags) => {
          setSelectedTags(tags);
        }}
        getTagRelationUrl={getTagRelationUrl}
        onShowRelations={(tag) => {
          showTagRelations(tag);
        }}
      />
    </>
  );
};
