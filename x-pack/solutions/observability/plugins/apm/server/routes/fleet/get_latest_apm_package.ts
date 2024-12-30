/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';
import { APMPluginStartDependencies } from '../../types';
import { APM_PACKAGE_NAME } from './get_cloud_apm_package_policy';

export async function getLatestApmPackage({
  fleetPluginStart,
  request,
}: {
  fleetPluginStart: NonNullable<APMPluginStartDependencies['fleet']>;
  request: KibanaRequest;
}) {
  const packageClient = fleetPluginStart.packageService.asScoped(request);
  const latestPackage = await packageClient.fetchFindLatestPackage(APM_PACKAGE_NAME);
  const packageInfo =
    'getBuffer' in latestPackage
      ? (await packageClient.readBundledPackage(latestPackage)).packageInfo
      : latestPackage;
  const { name, version, title, policy_templates: policyTemplates } = packageInfo;
  const firstTemplate = policyTemplates?.[0];
  const policyTemplateInputVars =
    firstTemplate && 'inputs' in firstTemplate ? firstTemplate.inputs?.[0].vars || [] : [];
  return { package: { name, version, title }, policyTemplateInputVars };
}
