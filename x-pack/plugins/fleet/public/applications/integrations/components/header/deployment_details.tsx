/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useStartServices } from '../../hooks';

import { DeploymentDetails as Component } from './deployment_details.component';

export const DeploymentDetails = () => {
  const { share, cloud, docLinks } = useStartServices();

  // If the cloud plugin isn't enabled, we can't display the flyout.
  if (!cloud) {
    return null;
  }

  const { isCloudEnabled, cloudId, cname } = cloud;

  // If cloud isn't enabled, we don't have a cloudId or a cname, we can't display the flyout.
  if (!isCloudEnabled || !cloudId || !cname) {
    return null;
  }

  // If the cname doesn't start with a known prefix, we can't display the flyout.
  // TODO: dover - this is a short term solution, see https://github.com/elastic/kibana/pull/114287#issuecomment-940111026
  if (
    !(
      cname.endsWith('elastic-cloud.com') ||
      cname.endsWith('found.io') ||
      cname.endsWith('found.no') ||
      cname.endsWith('foundit.no')
    )
  ) {
    return null;
  }

  const cnameNormalized = cname.startsWith('.') ? cname.substring(1) : cname;
  const endpointUrl = `https://${cloudId}.${cnameNormalized}`;

  const managementUrl = share.url.locators
    .get('MANAGEMENT_APP_LOCATOR')
    ?.useUrl({ sectionId: 'security', appId: 'api_keys' });

  const learnMoreUrl = docLinks.links.fleet.apiKeysLearnMore;

  return <Component {...{ cloudId, endpointUrl, managementUrl, learnMoreUrl }} />;
};
