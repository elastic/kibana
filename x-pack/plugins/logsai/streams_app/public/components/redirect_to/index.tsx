/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useLayoutEffect } from 'react';
import { PathsOf, TypeOf } from '@kbn/typed-react-router-config';
import { DeepPartial } from 'utility-types';
import { merge } from 'lodash';
import { EntitiesAppRoutes } from '../../routes/config';
import { useEntitiesAppRouter } from '../../hooks/use_entities_app_router';
import { useEntitiesAppParams } from '../../hooks/use_entities_app_params';

export function RedirectTo<
  TPath extends PathsOf<EntitiesAppRoutes>,
  TParams extends TypeOf<EntitiesAppRoutes, TPath, false>
>({ path, params }: { path: TPath; params?: DeepPartial<TParams> }) {
  const router = useEntitiesAppRouter();
  const currentParams = useEntitiesAppParams('/*');
  useLayoutEffect(() => {
    router.replace(path, ...([merge({}, currentParams, params)] as any));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <></>;
}
