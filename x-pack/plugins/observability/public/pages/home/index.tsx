/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useHasData } from '../../hooks/use_has_data';
import { LoadingObservability } from '../overview/loading_observability';

export function HomePage() {
  const history = useHistory();
  const { hasAnyData, isAllRequestsComplete } = useHasData();

  useEffect(() => {
    if (hasAnyData === true) {
      history.replace({ pathname: '/overview' });
    } else if (hasAnyData === false && isAllRequestsComplete === true) {
      history.replace({ pathname: '/landing' });
    }
  }, [hasAnyData, isAllRequestsComplete, history]);

  return <LoadingObservability />;
}
