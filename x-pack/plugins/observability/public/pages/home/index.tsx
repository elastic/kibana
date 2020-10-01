/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useContext, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { ObsvSharedContext } from '../../context/shared_data';
import { LoadingObservability } from '../overview/loading_observability';

export function HomePage() {
  const history = useHistory();

  const { sharedData } = useContext(ObsvSharedContext);

  const { hasAnyData } = sharedData ?? {};

  useEffect(() => {
    if (hasAnyData) {
      history.push({ pathname: '/overview' });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return !hasAnyData ? <LoadingObservability /> : null;
}
