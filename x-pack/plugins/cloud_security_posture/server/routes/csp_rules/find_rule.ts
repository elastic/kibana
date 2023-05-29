/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import pMap from 'p-map';
import { CspRuleTemplate } from '../../../common/schemas';
import {
  GetCspRuleTemplateHTTPBody,
  GetCspRuleTemplateHTTPResponse,
  findCspRuleTemplateRequest,
} from '../../../common/schemas/csp_rule_template_api/get_csp_rule_template';
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

// TODO:
// check sort fields optional values
// add fields as input to the request
// update the usage
// tests

const findCspRuleTemplateHandler = async (
  soClient: SavedObjectsClientContract,
  options: GetCspRuleTemplateHTTPBody
): Promise<GetCspRuleTemplateHTTPResponse> => {
  const res = await soClient.get<NewPackagePolicy>(
    PACKAGE_POLICY_SAVED_OBJECT_TYPE,
    options.packagePolicyId
  );
  const benchmarkId = getBenchmarkFromPackagePolicy(res.attributes.inputs);

  const cspRulesTemplatesSo = await soClient.find<CspRuleTemplate>({
    type: CSP_RULE_TEMPLATE_SAVED_OBJECT_TYPE,
    searchFields: ['metadata.name.text'],
    search: options.search ? `"${options.search}"*` : '',
    page: options.page,
    perPage: options.perPage,
    sortField: 'metadata.name',
    filter: getBenchmarkTypeFilter(benchmarkId),
  });

  const cspRulesTemplates = await pMap(
    cspRulesTemplatesSo.saved_objects,
    async (cspRuleTemplate) => {
      return { ...cspRuleTemplate.attributes };
    },
    { concurrency: 50 }
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

        const requestBody: GetCspRuleTemplateHTTPBody = request.query;
        const cspContext = await context.csp;

        const cspRulesTemplates: GetCspRuleTemplateHTTPResponse = await findCspRuleTemplateHandler(
          cspContext.soClient,
          requestBody
        );
        return response.ok({ body: cspRulesTemplates });
      }
    );
