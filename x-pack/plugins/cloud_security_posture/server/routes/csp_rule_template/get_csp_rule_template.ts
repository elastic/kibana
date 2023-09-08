/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { GetCspRuleTemplateRequest, GetCspRuleTemplateResponse } from '../../../common/types';
import { CspRuleTemplate } from '../../../common/schemas';
import { findCspRuleTemplateRequest } from '../../../common/schemas/csp_rule_template_api/get_csp_rule_template';
import {
  getBenchmarkFromPackagePolicy,
  getBenchmarkTypeFilter,
} from '../../../common/utils/helpers';

import {
  CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE,
  FIND_CSP_RULE_TEMPLATE_ROUTE_PATH,
} from '../../../common/constants';
import { CspRouter } from '../../types';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../benchmarks/benchmarks';

const getBenchmarkIdFromPackagePolicyId = async (
  soClient: SavedObjectsClientContract,
  packagePolicyId: string
): Promise<string> => {
  const res = await soClient.get<NewPackagePolicy>(
    PACKAGE_POLICY_SAVED_OBJECT_TYPE,
    packagePolicyId
  );
  return getBenchmarkFromPackagePolicy(res.attributes.inputs);
};

const findCspRuleTemplateHandler = async (
  soClient: SavedObjectsClientContract,
  options: GetCspRuleTemplateRequest
): Promise<GetCspRuleTemplateResponse> => {
  if (
    (!options.packagePolicyId && !options.benchmarkId) ||
    (options.packagePolicyId && options.benchmarkId)
  ) {
    throw new Error('Please provide either benchmarkId or packagePolicyId, but not both');
  }

  const benchmarkId = options.benchmarkId
    ? options.benchmarkId
    : await getBenchmarkIdFromPackagePolicyId(soClient, options.packagePolicyId!);

  const cspRulesTemplatesSo = await soClient.find<CspRuleTemplate>({
    type: CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE,
    searchFields: options.searchFields,
    search: options.search ? `"${options.search}"*` : '',
    page: options.page,
    perPage: options.perPage,
    sortField: options.sortField,
    fields: options?.fields,
    filter: getBenchmarkTypeFilter(benchmarkId),
  });

  const cspRulesTemplates = cspRulesTemplatesSo.saved_objects.map(
    (cspRuleTemplate) => cspRuleTemplate.attributes
  );

  return {
    items: cspRulesTemplates,
    total: cspRulesTemplatesSo.total,
    page: options.page,
    perPage: options.perPage,
  };
};

export const defineFindCspRuleTemplateRoute = (router: CspRouter) =>
  router.versioned
    .get({
      access: 'internal',
      path: FIND_CSP_RULE_TEMPLATE_ROUTE_PATH,
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: findCspRuleTemplateRequest,
          },
        },
      },
      async (context, request, response) => {
        if (!(await context.fleet).authz.fleet.all) {
          return response.forbidden();
        }

        const requestBody: GetCspRuleTemplateRequest = request.query;
        const cspContext = await context.csp;

        try {
          const cspRulesTemplates: GetCspRuleTemplateResponse = await findCspRuleTemplateHandler(
            cspContext.soClient,
            requestBody
          );
          return response.ok({ body: cspRulesTemplates });
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
