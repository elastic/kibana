/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiLoadingLogo, EuiPageSection, EuiPageTemplate } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { useKibana } from '../../hooks/use_kibana';
import { ConnectionDetails } from '../connection_details/connection_details';
import { QuickStats } from '../quick_stats/quick_stats';

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
        <div css={{ width: "1200px" }}>
          <ConnectionDetails elasticsearchUrl="http://localhost:9200" />

          <QuickStats />
        </div>
      </KibanaPageTemplate.Section>
      {embeddableConsole}
    </EuiPageTemplate>
  );
};
