/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { getLinkInfo } from '../links';
import { useRouteSpy } from '../utils/route/use_route_spy';

export const useUpdateBrowserTitle = () => {
  const [{ pageName }] = useRouteSpy();
  const linkInfo = getLinkInfo(pageName);

  useEffect(() => {
    document.title = `${linkInfo?.title ?? ''} - Kibana`;
  }, [pageName, linkInfo]);
};
