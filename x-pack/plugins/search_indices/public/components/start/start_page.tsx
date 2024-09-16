/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiLoadingLogo, EuiPageTemplate } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { ApiKeyForm } from '@kbn/search-api-keys/public';
import { useKibana } from '../../hooks/use_kibana';

export const ElasticsearchStartPage = () => {
  const { console: consolePlugin } = useKibana().services;

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  return (
    <EuiPageTemplate
      offset={0}
      restrictWidth={false}
      data-test-subj="search-startpage"
      grow={false}
    >
      <KibanaPageTemplate.Section alignment="center" restrictWidth={false} grow>
        <EuiLoadingLogo />
        <ApiKeyForm />
      </KibanaPageTemplate.Section>
      {embeddableConsole}
    </EuiPageTemplate>
  );
};
