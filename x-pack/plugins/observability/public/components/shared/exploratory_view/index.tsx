/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { ThemeContext } from 'styled-components';
import { ExploratoryView } from './exploratory_view';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityPublicPluginsStart } from '../../../plugin';
import { useBreadcrumbs } from '../../../hooks/use_breadcrumbs';
import { IndexPatternContextProvider } from './hooks/use_default_index_pattern';
import {
  createKbnUrlStateStorage,
  withNotifyOnErrors,
} from '../../../../../../../src/plugins/kibana_utils/public/';
import { UrlStorageContextProvider } from './hooks/use_url_strorage';
import { useInitExploratoryView } from './hooks/use_init_exploratory_view';
import { WithHeaderLayout } from '../../app/layout/with_header';

export function ExploratoryViewPage() {
  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.overview.exploratoryView', {
        defaultMessage: 'Exploratory view',
      }),
    },
  ]);

  const theme = useContext(ThemeContext);

  const {
    services: { uiSettings, notifications },
  } = useKibana<ObservabilityPublicPluginsStart>();

  const history = useHistory();

  const kbnUrlStateStorage = createKbnUrlStateStorage({
    history,
    useHash: uiSettings!.get('state:storeInSessionStorage'),
    ...withNotifyOnErrors(notifications!.toasts),
  });

  const indexPattern = useInitExploratoryView(kbnUrlStateStorage);

  return (
    <WithHeaderLayout
      headerColor={theme.eui.euiColorEmptyShade}
      bodyColor={theme.eui.euiPageBackgroundColor}
    >
      {indexPattern ? (
        <IndexPatternContextProvider indexPattern={indexPattern!}>
          <UrlStorageContextProvider storage={kbnUrlStateStorage}>
            <ExploratoryView />
          </UrlStorageContextProvider>
        </IndexPatternContextProvider>
      ) : null}
    </WithHeaderLayout>
  );
}
