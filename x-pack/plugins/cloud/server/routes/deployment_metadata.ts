/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { firstValueFrom, type Observable } from 'rxjs';
import type { EssDeploymentMetadata } from '../../common/types';

export const registerDeploymentMetadataRoute = ({
  httpRouter,
  deploymentMetadata$,
}: {
  httpRouter: IRouter;
  deploymentMetadata$: Observable<EssDeploymentMetadata>;
}) => {
  httpRouter.get(
    {
      path: '/internal/cloud/deployment_metadata',
      validate: false,
    },
    async (context, req, res) => {
      const deploymentMetadata = await firstValueFrom(deploymentMetadata$);
      return res.ok({ body: deploymentMetadata });
    }
  );
};
