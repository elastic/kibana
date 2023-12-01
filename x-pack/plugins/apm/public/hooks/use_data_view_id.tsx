/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useEffect, useState } from 'react';
import { getDataViewId } from '../../common/data_view_constants';
import { ApmPluginStartDeps } from '../plugin';

export function useDataViewId() {
  const [dataViewId, setDataViewId] = useState<string>(
    getDataViewId('default')
  );
  const { spaces } = useKibana<ApmPluginStartDeps>().services;

  useEffect(() => {
    const fetchSpaceId = async () => {
      const space = await spaces?.getActiveSpace();
      setDataViewId(getDataViewId(space?.id ?? 'default'));
    };

    fetchSpaceId();
  }, [spaces]);

  return dataViewId;
}
