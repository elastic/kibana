/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useHasDataContext } from '../../hooks/use_has_data_context';

export function HomePage() {
  const history = useHistory();

  const { hasAnyData } = useHasDataContext();

  useEffect(() => {
    if (hasAnyData === true) {
      history.push({ pathname: '/overview' });
    } else if (hasAnyData === false) {
      history.push({ pathname: '/landing' });
    }
  }, [hasAnyData, history]);

  return <></>;
}
