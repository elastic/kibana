/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { QueryStringInput } from '@kbn/unified-search-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { fromKueryExpression, luceneStringToDsl } from '@kbn/es-query';
import { STACK_ALERTS_FEATURE_ID } from '../../../../common/constants';

function validateQuery(query: Query) {
  try {
    query.language === 'kuery' ? fromKueryExpression(query.query) : luceneStringToDsl(query.query);
  } catch (err) {
    return false;
  }
  return true;
}

interface Props {
  dataView?: DataView;
  onChange: (query: Query) => void;
  query?: Query;
}

export const QueryInput = (props: Props) => {
  const { data, dataViews, docLinks, http, notifications, storage, uiSettings, unifiedSearch, usageCollection } =
    useKibana<{
      data: DataPublicPluginStart;
      dataViews: DataViewsPublicPluginStart;
      docLinks: DocLinksStart;
      http: HttpSetup;
      notifications: CoreStart['notifications'];
      uiSettings: IUiSettingsClient;
      storage: IStorageWrapper;
      unifiedSearch: UnifiedSearchPublicPluginStart;
      usageCollection: UsageCollectionStart;
    }>().services;

  const [localQuery, setLocalQuery] = useState<Query>(
    props.query || {
      query: '',
      language: 'kuery',
    }
  );

  return (
    <QueryStringInput
      disableAutoFocus
      bubbleSubmitEvent
      indexPatterns={props.dataView ? [props.dataView] : []}
      query={localQuery}
      onChange={(query) => {
        if (query.language) {
          setLocalQuery(query);
          if (validateQuery(query)) {
            props.onChange(query);
          }
        }
      }}
      appName={STACK_ALERTS_FEATURE_ID}
      deps={{
        unifiedSearch,
        notifications,
        http,
        docLinks,
        uiSettings,
        data,
        dataViews,
        storage,
        usageCollection,
      }}
    />
  );
}