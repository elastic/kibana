/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import createContainer from 'constate';
import { useState } from 'react';
import { Subject } from 'rxjs';
import { ENTITIES_LATEST_ALIAS } from '../../common/entities';
import { useAdHocDataView } from './use_adhoc_data_view';

function useUnifiedSearch() {
  const { dataView } = useAdHocDataView(ENTITIES_LATEST_ALIAS);
  const [refreshSubject$] = useState<Subject<void>>(new Subject());

  return {
    dataView,
    refreshSubject$,
  };
}

const UnifiedSearch = createContainer(useUnifiedSearch);
export const [UnifiedSearchProvider, useUnifiedSearchContext] = UnifiedSearch;
