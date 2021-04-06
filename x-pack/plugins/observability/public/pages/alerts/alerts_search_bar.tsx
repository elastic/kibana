/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { SearchBar, TimeHistory } from '../../../../../../src/plugins/data/public';
import { Storage } from '../../../../../../src/plugins/kibana_utils/public';

export function AlertsSearchBar() {
  return (
    <SearchBar
      indexPatterns={[]}
      placeholder={i18n.translate('xpack.observability.alerts.searchBarPlaceholder', {
        defaultMessage: '"domain": "ecommerce" AND ("service.name": "ProductCatalogService" …)',
      })}
      query={{ query: '', language: 'kuery' }}
      timeHistory={new TimeHistory(new Storage(localStorage))}
    />
  );
}
