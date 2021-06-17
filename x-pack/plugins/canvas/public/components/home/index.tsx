/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { getBaseBreadcrumb } from '../../lib/breadcrumbs';
import { resetWorkpad } from '../../state/actions/workpad';
import { Home as Component } from './home.component';
import { usePlatformService } from '../../services';

export const Home = () => {
  const { setBreadcrumbs } = usePlatformService();
  const [isMounted, setIsMounted] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isMounted) {
      dispatch(resetWorkpad());
      setIsMounted(true);
    }
  }, [dispatch, isMounted, setIsMounted]);

  useEffect(() => {
    setBreadcrumbs([getBaseBreadcrumb()]);
  }, [setBreadcrumbs]);

  return <Component />;
};
