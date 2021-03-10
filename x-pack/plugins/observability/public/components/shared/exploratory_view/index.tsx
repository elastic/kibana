/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ExploratoryView } from './exploratory_view';
import { useFetcher } from '../../..';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityClientPluginsStart } from '../../../plugin';
import { useBreadcrumbs } from '../../../hooks/use_breadcrumbs';
import { i18n } from '@kbn/i18n';
import { IndexPatternContextProvider } from '../../../hooks/use_default_index_pattern';
import { useHistory } from 'react-router-dom';
import {
  createKbnUrlStateStorage,
  withNotifyOnErrors,
} from '../../../../../../../src/plugins/kibana_utils/public/';
import { UrlStorageContextProvider } from './hooks/use_url_strorage';
import { DataViewType } from './types';
import { getDefaultConfigs } from './configurations/default_configs';

export interface Props {
  dataViewType: DataViewType;
}

export const ExploratoryViewPage = ({ dataViewType }: Props) => {
  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.overview.exploratoryView', {
        defaultMessage: 'Exploratory view',
      }),
    },
    {
      text: i18n.translate('xpack.observability.overview.exploratoryView.dataViewType', {
        defaultMessage: dataViewType,
      }),
    },
  ]);

  const {
    services: { data, uiSettings, notifications },
  } = useKibana<ObservabilityClientPluginsStart>();

  const history = useHistory();

  const kbnUrlStateStorage = createKbnUrlStateStorage({
    history,
    useHash: uiSettings!.get('state:storeInSessionStorage'),
    ...withNotifyOnErrors(notifications!.toasts),
  });

  const dataViewConfig = getDefaultConfigs({ dataViewType });

  const { data: defaultIndexPattern } = useFetcher(
    () => data.indexPatterns.get(dataViewConfig.indexPattern),
    [dataViewConfig.indexPattern]
  );

  return (
    <IndexPatternContextProvider indexPattern={defaultIndexPattern!}>
      <UrlStorageContextProvider storage={kbnUrlStateStorage}>
        <ExploratoryView seriesId={dataViewType!} defaultIndexPattern={defaultIndexPattern} />
      </UrlStorageContextProvider>
    </IndexPatternContextProvider>
  );
};
