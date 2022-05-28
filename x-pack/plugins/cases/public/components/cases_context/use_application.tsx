/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from '../../common/lib/kibana';

interface UseApplicationReturn {
  appId: string | undefined;
  appTitle: string | undefined;
}

export const useApplication = (): UseApplicationReturn => {
  const { currentAppId$, applications$ } = useKibana().services.application;
  // retrieve the most recent value from the BehaviorSubject
  const appId = useObservable(currentAppId$);
  const applications = useObservable(applications$);

  const appTitle = appId ? applications?.get(appId)?.category?.label : undefined;

  return { appId, appTitle };
};
