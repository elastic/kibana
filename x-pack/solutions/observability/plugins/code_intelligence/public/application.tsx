/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageTemplate } from '@elastic/eui';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

import type { Repository } from './api';
import { getRepositories } from './api';
import { CatalogView } from './catalog_view';
import { RepositoriesView } from './repositories_view';

type Tab = 'repositories' | 'catalog';

const Application = ({ core }: { core: CoreStart }) => {
  const [tab, setTab] = useState<Tab>('repositories');
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [requestSequence, setRequestSequence] = useState(0);

  const reload = useCallback(() => setRequestSequence((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    void getRepositories(core.http)
      .then((result) => {
        if (active) setRepositories(result);
      })
      .catch(() => {
        if (active) {
          setRepositories([]);
          setError(
            i18n.translate('xpack.codeIntelligence.repositories.loadError', {
              defaultMessage: 'The configured repositories could not be loaded.',
            })
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [core.http, requestSequence]);

  return (
    <EuiPageTemplate restrictWidth={false}>
      <EuiPageTemplate.Header
        pageTitle={i18n.translate('xpack.codeIntelligence.pageTitle', {
          defaultMessage: 'Code Intelligence',
        })}
        description={i18n.translate('xpack.codeIntelligence.pageDescription', {
          defaultMessage: 'Extract and inspect code-derived observability signals.',
        })}
        tabs={[
          {
            isSelected: tab === 'repositories',
            onClick: () => setTab('repositories'),
            label: i18n.translate('xpack.codeIntelligence.repositoriesTab', {
              defaultMessage: 'Repositories',
            }),
          },
          {
            isSelected: tab === 'catalog',
            onClick: () => setTab('catalog'),
            label: i18n.translate('xpack.codeIntelligence.catalogTab', {
              defaultMessage: 'Catalog',
            }),
          },
        ]}
      />
      <EuiPageTemplate.Section>
        {tab === 'repositories' ? (
          <RepositoriesView
            http={core.http}
            repositories={repositories}
            loading={loading}
            error={error}
            reload={reload}
          />
        ) : (
          <CatalogView
            http={core.http}
            repositories={repositories}
            repositoriesLoading={loading}
            repositoriesError={error}
            reloadRepositories={reload}
          />
        )}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};

export const renderApp = (core: CoreStart, { element }: AppMountParameters) => {
  element.classList.add(APP_WRAPPER_CLASS);
  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <Application core={core} />
    </KibanaRenderContextProvider>,
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
};
