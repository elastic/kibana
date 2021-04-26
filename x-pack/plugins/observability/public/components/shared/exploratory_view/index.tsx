/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { ExploratoryView } from './exploratory_view';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { ObservabilityPublicPluginsStart } from '../../../plugin';
import { useBreadcrumbs } from '../../../hooks/use_breadcrumbs';
import { IndexPatternContextProvider } from './hooks/use_app_index_pattern';
import {
  createKbnUrlStateStorage,
  withNotifyOnErrors,
} from '../../../../../../../src/plugins/kibana_utils/public/';
import { UrlStorageContextProvider } from './hooks/use_url_storage';
import { useTrackPageview } from '../../..';

export function ExploratoryViewPage() {
  useTrackPageview({ app: 'observability-overview', path: 'exploratory-view' });
  useTrackPageview({ app: 'observability-overview', path: 'exploratory-view', delay: 15000 });

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.overview.exploratoryView', {
        defaultMessage: 'Exploratory view',
      }),
    },
  ]);

  const {
    services: { uiSettings, notifications },
  } = useKibana<ObservabilityPublicPluginsStart>();

  const history = useHistory();

  const kbnUrlStateStorage = createKbnUrlStateStorage({
    history,
    useHash: uiSettings!.get('state:storeInSessionStorage'),
    ...withNotifyOnErrors(notifications!.toasts),
  });

  return (
    <Wrapper>
      <IndexPatternContextProvider>
        <UrlStorageContextProvider storage={kbnUrlStateStorage}>
          <ExploratoryView />
        </UrlStorageContextProvider>
      </IndexPatternContextProvider>
    </Wrapper>
  );
}

const Wrapper = euiStyled.div`
  padding: ${(props) => props.theme.eui.paddingSizes.l};
`;
