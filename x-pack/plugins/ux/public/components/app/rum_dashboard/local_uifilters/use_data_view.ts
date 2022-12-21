/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext, useEffect } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { CsmSharedContext } from '../csm_shared_context';

export function useDataView() {
  const { dataView } = useContext(CsmSharedContext);

  const [dataViewTitle, setDataViewTitle] = useLocalStorage(
    'uxAppDataViewTitle',
    ''
  );

  const updatedDataViewTitle = dataView?.title;

  useEffect(() => {
    setDataViewTitle(updatedDataViewTitle);
  }, [setDataViewTitle, updatedDataViewTitle]);

  return { dataViewTitle, dataView };
}
