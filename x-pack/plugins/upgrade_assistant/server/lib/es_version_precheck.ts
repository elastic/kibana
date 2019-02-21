/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Request, RouteOptionsPreObject } from 'hapi';
import { uniq } from 'lodash';
import { SemVer } from 'semver';

import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { CURRENT_VERSION } from '../../common/version';

/**
 * Returns an array of all the unique Elasticsearch Node Versions in the Elasticsearch cluster.
 * @param request
 */
export const getAllNodeVersions = async (callCluster: CallCluster) => {
  // Get the version information for all nodes in the cluster.
  const { nodes } = (await callCluster('nodes.info', {
    filterPath: 'nodes.*.version',
  })) as { nodes: { [nodeId: string]: { version: string } } };

  const versionStrings = Object.values(nodes).map(({ version }) => version);

  return uniq(versionStrings)
    .sort()
    .map(version => new SemVer(version));
};

export const verifyAllMatchKibanaVersion = (allNodeVersions: SemVer[]) => {
  // Determine if all nodes in the cluster are running the same major version as Kibana.
  const anyDifferentEsNodes = !!allNodeVersions.find(
    esNodeVersion => esNodeVersion.major !== CURRENT_VERSION.major
  );

  if (anyDifferentEsNodes) {
    throw new Boom(`There are some nodes running a different version of Elasticsearch`, {
      // 426 means "Upgrade Required" and is used when semver compatibility is not met.
      statusCode: 426,
    });
  }
};

export const EsVersionPrecheck = {
  assign: 'esVersionCheck',
  async method(request: Request) {
    const { callWithRequest } = request.server.plugins.elasticsearch.getCluster('admin');
    const callCluster = callWithRequest.bind(callWithRequest, request) as CallCluster;

    const allNodeVersions = await getAllNodeVersions(callCluster);
    // This will throw if there is an issue
    verifyAllMatchKibanaVersion(allNodeVersions);

    return true;
  },
} as RouteOptionsPreObject;
