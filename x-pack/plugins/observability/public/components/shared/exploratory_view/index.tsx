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
  createSessionStorageStateStorage,
} from '../../../../../../../src/plugins/kibana_utils/public/';
import { UrlStorageContextProvider } from './hooks/use_series_storage';
import { useTrackPageview } from '../../..';
import { TypedLensByValueInput } from '../../../../../lens/public';

export function ExploratoryViewPage({
  saveAttributes,
  useSessionStorage = false,
}: {
  useSessionStorage?: boolean;
  saveAttributes?: (attr: TypedLensByValueInput['attributes'] | null) => void;
}) {
  useTrackPageview({ app: 'observability-overview', path: 'exploratory-view' });
  useTrackPageview({ app: 'observability-overview', path: 'exploratory-view', delay: 15000 });

  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.overview.exploratoryView', {
        defaultMessage: 'Analyze data',
      }),
    },
  ]);

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
    <Wrapper>
      <IndexPatternContextProvider>
        <UrlStorageContextProvider storage={kbnUrlStateStorage}>
          <ExploratoryView saveAttributes={saveAttributes} />
        </UrlStorageContextProvider>
      </IndexPatternContextProvider>
    </Wrapper>
  );
}

const Wrapper = euiStyled.div`
  padding: ${(props) => props.theme.eui.paddingSizes.l};
`;
