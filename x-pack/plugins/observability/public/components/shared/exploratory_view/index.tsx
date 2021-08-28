/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common/eui_styled_components';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public/context/context';
import { withNotifyOnErrors } from '../../../../../../../src/plugins/kibana_utils/public/state_management/url/errors';
import { createKbnUrlStateStorage } from '../../../../../../../src/plugins/kibana_utils/public/state_sync/state_sync_state_storage/create_kbn_url_state_storage';
import { createSessionStorageStateStorage } from '../../../../../../../src/plugins/kibana_utils/public/state_sync/state_sync_state_storage/create_session_storage_state_storage';
import type { TypedLensByValueInput } from '../../../../../lens/public/embeddable/embeddable_component';
import { useBreadcrumbs } from '../../../hooks/use_breadcrumbs';
import { useTrackPageview } from '../../../hooks/use_track_metric';
import type { ObservabilityPublicPluginsStart } from '../../../plugin';
import { ExploratoryView } from './exploratory_view';
import { IndexPatternContextProvider } from './hooks/use_app_index_pattern';
import { UrlStorageContextProvider } from './hooks/use_series_storage';

export function ExploratoryViewPage({
  saveAttributes,
  multiSeries = false,
  useSessionStorage = false,
}: {
  useSessionStorage?: boolean;
  multiSeries?: boolean;
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
          <ExploratoryView saveAttributes={saveAttributes} multiSeries={multiSeries} />
        </UrlStorageContextProvider>
      </IndexPatternContextProvider>
    </Wrapper>
  );
}

const Wrapper = euiStyled.div`
  padding: ${(props) => props.theme.eui.paddingSizes.l};
`;
