/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiLoadingLogo, EuiPageTemplate } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { useKibana } from '../../hooks/use_kibana';
import { useIndicesStatusQuery } from '../../hooks/api/use_indices_status';
import { useUserPrivilegesQuery } from '../../hooks/api/use_user_permissions';
import { LoadIndicesStatusError } from '../shared/load_indices_status_error';

import { CreateIndex } from './create_index';
import { usePageChrome } from '../../hooks/use_page_chrome';
import { IndexManagementBreadcrumbs } from '../shared/breadcrumbs';

const CreateIndexLabel = i18n.translate('xpack.searchIndices.createIndex.docTitle', {
  defaultMessage: 'Create Index',
});

export const CreateIndexPage = () => {
  const { console: consolePlugin } = useKibana().services;
  const {
    data: indicesData,
    isInitialLoading,
    isError: hasIndicesStatusFetchError,
    error: indicesFetchError,
  } = useIndicesStatusQuery();
  const { data: userPrivileges } = useUserPrivilegesQuery();

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );
  usePageChrome(CreateIndexLabel, [...IndexManagementBreadcrumbs, { text: CreateIndexLabel }]);

  return (
    <EuiPageTemplate
      offset={0}
      restrictWidth={false}
      data-test-subj="elasticsearchCreateIndexPage"
      grow={false}
    >
      <KibanaPageTemplate.Section alignment="center" restrictWidth={false} grow>
        {isInitialLoading && <EuiLoadingLogo />}
        {hasIndicesStatusFetchError && <LoadIndicesStatusError error={indicesFetchError} />}
        {!isInitialLoading && !hasIndicesStatusFetchError && (
          <CreateIndex indicesData={indicesData} userPrivileges={userPrivileges} />
        )}
      </KibanaPageTemplate.Section>
      {embeddableConsole}
    </EuiPageTemplate>
  );
};
