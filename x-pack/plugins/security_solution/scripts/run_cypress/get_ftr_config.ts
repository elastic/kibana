/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { EsVersion, readConfigFile } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import { getLocalhostRealIp } from '../endpoint/common/localhost_services';
import { parseTestFileConfig } from './utils';

export const getFtrConfig = async ({
  log,
  ftrConfigFile,
  specFilePath,
  esPort,
  kibanaPort,
  fleetServerPort,
}: {
  log: ToolingLog;
  ftrConfigFile: string;
  specFilePath: string;
  esPort: number;
  kibanaPort: number;
  fleetServerPort: number;
}) => {
  const hostRealIp = getLocalhostRealIp();

  const configFromTestFile = parseTestFileConfig(specFilePath);

  const config = await readConfigFile(
    log,
    EsVersion.getDefault(),
    ftrConfigFile,
    {
      servers: {
        elasticsearch: {
          port: esPort,
        },
        kibana: {
          port: kibanaPort,
        },
        fleetserver: {
          port: fleetServerPort,
        },
      },
      kbnTestServer: {
        serverArgs: [
          `--server.port=${kibanaPort}`,
          `--elasticsearch.hosts=http://0.0.0.0:${esPort}`,
        ],
      },
    },
    (vars) => {
      const hasFleetServerArgs = _.some(
        vars.kbnTestServer.serverArgs,
        (value) =>
          value.includes('--xpack.fleet.agents.fleet_server.hosts') ||
          value.includes('--xpack.fleet.agents.elasticsearch.host')
      );

      vars.kbnTestServer.serverArgs = _.filter(
        vars.kbnTestServer.serverArgs,
        (value) =>
          !(
            value.includes('--elasticsearch.hosts=http://localhost:9220') ||
            value.includes('--xpack.fleet.agents.fleet_server.hosts') ||
            value.includes('--xpack.fleet.agents.elasticsearch.host')
          )
      );

      if (
        configFromTestFile?.enableExperimental?.length &&
        _.some(vars.kbnTestServer.serverArgs, (value) =>
          value.includes('--xpack.securitySolution.enableExperimental')
        )
      ) {
        vars.kbnTestServer.serverArgs = _.filter(
          vars.kbnTestServer.serverArgs,
          (value) => !value.includes('--xpack.securitySolution.enableExperimental')
        );
        vars.kbnTestServer.serverArgs.push(
          `--xpack.securitySolution.enableExperimental=${JSON.stringify(
            configFromTestFile?.enableExperimental
          )}`
        );
      }

      if (configFromTestFile?.license) {
        if (vars.serverless) {
          log.warning(
            `'ftrConfig.license' ignored. Value does not apply to kibana when running in serverless.\nFile: ${specFilePath}`
          );
        } else {
          vars.esTestCluster.license = configFromTestFile.license;
        }
      }

      if (hasFleetServerArgs) {
        vars.kbnTestServer.serverArgs.push(
          `--xpack.fleet.agents.elasticsearch.host=http://${hostRealIp}:${esPort}`
        );
      }

      // Serverless Specific
      if (vars.serverless) {
        log.info(`Serverless mode detected`);

        if (configFromTestFile?.productTypes) {
          vars.kbnTestServer.serverArgs.push(
            `--xpack.securitySolutionServerless.productTypes=${JSON.stringify([
              ...configFromTestFile.productTypes,
              // Why spread it twice?
              // The `serverless.security.yml` file by default includes two product types as of this change.
              // Because it's an array, we need to ensure that existing values are "removed" and the ones
              // defined here are added. To do that, we duplicate the `productTypes` passed so that all array
              // elements in that YAML file are updated. The Security serverless plugin has code in place to
              // dedupe.
              ...configFromTestFile.productTypes,
            ])}`
          );
        }
      } else if (configFromTestFile?.productTypes) {
        log.warning(
          `'ftrConfig.productTypes' ignored. Value applies only when running kibana is serverless.\nFile: ${specFilePath}`
        );
      }

      return vars;
    }
  );

  return config;
};
