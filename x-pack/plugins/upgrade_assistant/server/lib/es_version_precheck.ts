/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { SemVer } from 'semver';
import {
  IScopedClusterClient,
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
} from '@kbn/core/server';
import { versionService } from './version';

/**
 * Returns an array of all the unique Elasticsearch Node Versions in the Elasticsearch cluster.
 */
export const getAllNodeVersions = async (adminClient: IScopedClusterClient) => {
  // Get the version information for all nodes in the cluster.
  const response = await adminClient.asInternalUser.nodes.info({
    filter_path: 'nodes.*.version',
  });

  const nodes = response.nodes;

  const versionStrings = Object.values(nodes).map(({ version }) => version);

  return uniq(versionStrings)
    .sort()
    .map((version) => new SemVer(version));
};

export const verifyAllMatchKibanaVersion = (allNodeVersions: SemVer[], majorVersion: number) => {
  // Determine if all nodes in the cluster are running the same major version as Kibana.
  const numDifferentVersion = allNodeVersions.filter(
    (esNodeVersion) => esNodeVersion.major !== majorVersion
  ).length;

  const numSameVersion = allNodeVersions.filter(
    (esNodeVersion) => esNodeVersion.major === majorVersion
  ).length;

  if (numDifferentVersion) {
    return {
      allNodesMatch: false,
      // If Kibana is talking to nodes and none have the same major version as Kibana, they must a be of
      // a higher major version.
      allNodesUpgraded: numSameVersion === 0,
    };
  }
  return {
    allNodesMatch: true,
    allNodesUpgraded: false,
  };
};

/**
 * This is intended as controller/handler level code so it knows about HTTP
 */
export const esVersionCheck = async (
  ctx: RequestHandlerContext,
  response: KibanaResponseFactory
) => {
  const { client } = ctx.core.elasticsearch;
  let allNodeVersions: SemVer[];

  try {
    allNodeVersions = await getAllNodeVersions(client);
  } catch (e) {
    if (e.statusCode === 403) {
      return response.forbidden({ body: e.message });
    }

    throw e;
  }

  const majorVersion = versionService.getMajorVersion();

  const result = verifyAllMatchKibanaVersion(allNodeVersions, majorVersion);
  if (!result.allNodesMatch) {
    return response.customError({
      // 426 means "Upgrade Required" and is used when semver compatibility is not met.
      statusCode: 426,
      body: {
        message: 'There are some nodes running a different version of Elasticsearch',
        attributes: {
          allNodesUpgraded: result.allNodesUpgraded,
        },
      },
    });
  }
};

export const versionCheckHandlerWrapper =
  <P, Q, B>(handler: RequestHandler<P, Q, B>) =>
  async (
    ctx: RequestHandlerContext,
    request: KibanaRequest<P, Q, B>,
    response: KibanaResponseFactory
  ) => {
    const errorResponse = await esVersionCheck(ctx, response);
    if (errorResponse) {
      return errorResponse;
    }
    return handler(ctx, request, response);
  };
