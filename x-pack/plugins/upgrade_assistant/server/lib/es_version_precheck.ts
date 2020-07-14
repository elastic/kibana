/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';
import { SemVer } from 'semver';
import {
  ILegacyScopedClusterClient,
  KibanaRequest,
  KibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
} from 'src/core/server';
import { CURRENT_VERSION } from '../../common/version';

/**
 * Returns an array of all the unique Elasticsearch Node Versions in the Elasticsearch cluster.
 */
export const getAllNodeVersions = async (adminClient: ILegacyScopedClusterClient) => {
  // Get the version information for all nodes in the cluster.
  const { nodes } = (await adminClient.callAsInternalUser('nodes.info', {
    filterPath: 'nodes.*.version',
  })) as { nodes: { [nodeId: string]: { version: string } } };

  const versionStrings = Object.values(nodes).map(({ version }) => version);

  return uniq(versionStrings)
    .sort()
    .map((version) => new SemVer(version));
};

export const verifyAllMatchKibanaVersion = (allNodeVersions: SemVer[]) => {
  // Determine if all nodes in the cluster are running the same major version as Kibana.
  const numDifferentVersion = allNodeVersions.filter(
    (esNodeVersion) => esNodeVersion.major !== CURRENT_VERSION.major
  ).length;

  const numSameVersion = allNodeVersions.filter(
    (esNodeVersion) => esNodeVersion.major === CURRENT_VERSION.major
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
  const { client } = ctx.core.elasticsearch.legacy;
  let allNodeVersions: SemVer[];

  try {
    allNodeVersions = await getAllNodeVersions(client);
  } catch (e) {
    if (e.status === 403) {
      return response.forbidden({ body: e.message });
    }

    throw e;
  }

  const result = verifyAllMatchKibanaVersion(allNodeVersions);
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

export const versionCheckHandlerWrapper = <P, Q, B>(handler: RequestHandler<P, Q, B>) => async (
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
