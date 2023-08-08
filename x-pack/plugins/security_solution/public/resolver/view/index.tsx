/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { ResolverProps } from '../types';
import { ResolverWithoutProviders } from './resolver_without_providers';
import { createResolver } from '../store/actions';
import type { State } from '../../common/store/types';
/**
 * The `Resolver` component to use. This sets up the DataAccessLayer provider. Use `ResolverWithoutProviders` in tests or in other scenarios where you want to provide a different (or fake) data access layer.
 */
// eslint-disable-next-line react/display-name
export const Resolver = React.memo((props: ResolverProps) => {
  const store = useSelector((state: State) => state.analyzer[props.resolverComponentInstanceID]);

  const dispatch = useDispatch();
  if (!store) {
    dispatch(createResolver({ id: props.resolverComponentInstanceID }));
  }

  useEffect(() => {
    if (props.shouldUpdate) {
      dispatch(createResolver({ id: props.resolverComponentInstanceID }));
    }
  }, [dispatch, props.shouldUpdate, props.resolverComponentInstanceID]);
  return <ResolverWithoutProviders {...props} />;
});
