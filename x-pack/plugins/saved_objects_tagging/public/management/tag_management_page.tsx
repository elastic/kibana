/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useCallback, FC } from 'react';
import { EuiPageContent, Query } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ChromeBreadcrumb, OverlayStart } from 'src/core/public';
import { toMountPoint } from '../../../../../src/plugins/kibana_react/public';
import { ITagsClient } from '../../common/types';
import { Header, SearchBar, CreateOrEditModal } from './components';

interface TagManagementPageParams {
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  overlays: OverlayStart;
  tagClient: ITagsClient;
}

export const TagManagementPage: FC<TagManagementPageParams> = ({
  setBreadcrumbs,
  overlays,
  tagClient,
}) => {
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

  const onQueryChange = useCallback((query: Query) => {
    // console.log('query change:', query);
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
    </EuiPageContent>
  );
};
