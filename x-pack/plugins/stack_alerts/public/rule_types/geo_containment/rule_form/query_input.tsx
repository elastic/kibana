/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataView, DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { Query } from '@kbn/es-query';
import { fromKueryExpression, luceneStringToDsl } from '@kbn/es-query';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import type { CoreStart } from '@kbn/core/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { STACK_ALERTS_FEATURE_ID } from '@kbn/rule-data-utils';

function validateQuery(query: Query) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
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
  const {
    unifiedSearch: {
      ui: { QueryStringInput },
    },
  } = useKibana<{
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
    />
  );
};
