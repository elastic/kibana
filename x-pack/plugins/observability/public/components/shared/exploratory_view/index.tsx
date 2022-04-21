/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  createKbnUrlStateStorage,
  withNotifyOnErrors,
  createSessionStorageStateStorage,
} from '@kbn/kibana-utils-plugin/public';
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { ExploratoryView } from './exploratory_view';
import { ObservabilityPublicPluginsStart } from '../../../plugin';
import { useBreadcrumbs } from '../../../hooks/use_breadcrumbs';
import { DataViewContextProvider } from './hooks/use_app_data_view';
import { UrlStorageContextProvider } from './hooks/use_series_storage';
import { useTrackPageview } from '../../..';
import { usePluginContext } from '../../../hooks/use_plugin_context';

const PAGE_TITLE = i18n.translate('xpack.observability.expView.heading.label', {
  defaultMessage: 'Explore data',
});

export interface ExploratoryViewPageProps {
  useSessionStorage?: boolean;
  saveAttributes?: (attr: TypedLensByValueInput['attributes'] | null) => void;
  app?: { id: string; label: string };
}

export function ExploratoryViewPage({
  app,
  saveAttributes,
  useSessionStorage = false,
}: ExploratoryViewPageProps) {
  useTrackPageview({ app: 'observability-overview', path: 'exploratory-view' });
  useTrackPageview({
    app: 'observability-overview',
    path: 'exploratory-view',
    delay: 15000,
  });

  useBreadcrumbs(
    [
      {
        text: i18n.translate('xpack.observability.overview.exploratoryView', {
          defaultMessage: 'Explore data',
        }),
      },
    ],
    app
  );

  const { ObservabilityPageTemplate } = usePluginContext();
  const {
    services: { uiSettings, notifications },
  } = useKibana<ObservabilityPublicPluginsStart>();

  const history = useHistory();

  const kbnUrlStateStorage = useSessionStorage
    ? createSessionStorageStateStorage()
    : createKbnUrlStateStorage({
        history,
        useHash: uiSettings!.get('state:storeInSessionStorage'),
        ...withNotifyOnErrors(notifications!.toasts),
      });

  return (
    <ObservabilityPageTemplate pageHeader={{ pageTitle: PAGE_TITLE }}>
      <DataViewContextProvider>
        <UrlStorageContextProvider storage={kbnUrlStateStorage}>
          <ExploratoryView saveAttributes={saveAttributes} />
        </UrlStorageContextProvider>
      </DataViewContextProvider>
    </ObservabilityPageTemplate>
  );
}

// eslint-disable-next-line import/no-default-export
export default ExploratoryViewPage;
