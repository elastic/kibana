/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useDispatch, useSelector } from 'react-redux';
import React, { useCallback } from 'react';
import { DataPublicPluginSetup } from 'src/plugins/data/public';
import { OverviewPageComponent } from '../../pages/overview';
import { selectIndexPattern } from '../../state/selectors';
import { setEsKueryString } from '../../state/actions';

export interface OverviewPageProps {
  autocomplete: DataPublicPluginSetup['autocomplete'];
}

export const OverviewPage: React.FC<OverviewPageProps> = props => {
  const dispatch = useDispatch();
  const setEsKueryFilters = useCallback(
    (esFilters: string) => dispatch(setEsKueryString(esFilters)),
    [dispatch]
  );
  const indexPattern = useSelector(selectIndexPattern);
  return (
    <OverviewPageComponent setEsKueryFilters={setEsKueryFilters} {...indexPattern} {...props} />
  );
};
