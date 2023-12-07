/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { transformError } from '@kbn/securitysolution-es-utils';
import semverCompare from 'semver/functions/compare';
import semverValid from 'semver/functions/valid';
import {
  CspBenchmarkRule,
  FindCspBenchmarkRuleRequest,
  FindCspBenchmarkRuleResponse,
  findCspBenchmarkRuleRequestSchema,
} from '@kbn/cloud-security-posture-plugin/common/types/latest';
import { getBenchmarkFromPackagePolicy } from '../../../../common/utils/helpers';

import { FIND_CSP_BENCHMARK_RULE_ROUTE_PATH } from '../../../../common/constants';
import { CspRouter } from '../../../types';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../benchmarks/benchmarks';
import { findRuleHandler as findRuleHandlerV1 } from './v1';

export const getSortedCspBenchmarkRulesTemplates = (cspBenchmarkRules: CspBenchmarkRule[]) => {
  return cspBenchmarkRules.slice().sort((a, b) => {
    const ruleNumberA = a?.metadata?.benchmark?.rule_number;
    const ruleNumberB = b?.metadata?.benchmark?.rule_number;

    const versionA = semverValid(ruleNumberA);
    const versionB = semverValid(ruleNumberB);

    if (versionA !== null && versionB !== null) {
      return semverCompare(versionA, versionB);
    } else {
      return String(ruleNumberA).localeCompare(String(ruleNumberB));
    }
  });
};

export const getBenchmarkIdFromPackagePolicyId = async (
  soClient: SavedObjectsClientContract,
  packagePolicyId: string
): Promise<string> => {
  const res = await soClient.get<NewPackagePolicy>(
    PACKAGE_POLICY_SAVED_OBJECT_TYPE,
    packagePolicyId
  );
  return getBenchmarkFromPackagePolicy(res.attributes.inputs);
};

export const defineFindCspBenchmarkRuleRoute = (router: CspRouter) =>
  router.versioned
    .get({
      access: 'internal',
      path: FIND_CSP_BENCHMARK_RULE_ROUTE_PATH,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: findCspBenchmarkRuleRequestSchema,
          },
        },
      },
      async (context, request, response) => {
        if (!(await context.fleet).authz.fleet.all) {
          return response.forbidden();
        }

        const requestBody: FindCspBenchmarkRuleRequest = request.query;
        const cspContext = await context.csp;

        try {
          const cspBenchmarkRules: FindCspBenchmarkRuleResponse = await findRuleHandlerV1(
            cspContext.soClient,
            requestBody
          );
          return response.ok({ body: cspBenchmarkRules });
        } catch (err) {
          const error = transformError(err);
          cspContext.logger.error(`Failed to fetch csp rules templates ${err}`);
          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
