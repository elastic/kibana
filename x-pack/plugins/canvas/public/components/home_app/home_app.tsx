/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { getBaseBreadcrumb } from '../../lib/breadcrumbs';
import { usePlatformService } from '../../services';
import { resetWorkpad } from '../../state/actions/workpad';
import { HomeApp as Component } from './home_app.component';

export const HomeApp = () => {
  const { setBreadcrumbs } = usePlatformService();
  const dispatch = useDispatch();
  const onLoad = () => dispatch(resetWorkpad());
  const history = useHistory();

  useEffect(() => {
    setBreadcrumbs([getBaseBreadcrumb(history)]);
  }, [setBreadcrumbs, history]);

  return <Component onLoad={onLoad} />;
};
