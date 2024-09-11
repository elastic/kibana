/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiLoadingLogo, EuiPageTemplate } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { useKibana } from '../../hooks/use_kibana';
import { useIndicesStatusQuery } from '../../hooks/api/use_indices_status';
import { useUserPrivilegesQuery } from '../../hooks/api/use_user_permissions';

import { useIndicesRedirect } from './hooks/use_indices_redirect';
import { ElasticsearchStart } from './elasticsearch_start';
import { StartPageError } from './status_error';

export const ElasticsearchStartPage = () => {
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
  useIndicesRedirect(indicesData);

  return (
    <EuiPageTemplate
      offset={0}
      restrictWidth={false}
      data-test-subj="elasticsearchStartPage"
      grow={false}
    >
      <KibanaPageTemplate.Section alignment="center" restrictWidth={false} grow>
        {isInitialLoading && <EuiLoadingLogo />}
        {hasIndicesStatusFetchError && <StartPageError error={indicesFetchError} />}
        <ElasticsearchStart indicesData={indicesData} userPrivileges={userPrivileges} />
      </KibanaPageTemplate.Section>
      {embeddableConsole}
    </EuiPageTemplate>
  );
};
