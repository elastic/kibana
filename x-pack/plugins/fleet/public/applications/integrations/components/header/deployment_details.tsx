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

  const { isCloudEnabled, cloudId } = cloud;

  // If cloud isn't enabled or we don't have a cloudId we can't display the flyout.
  if (!isCloudEnabled || !cloudId) {
    return null;
  }

  const managementUrl = share.url.locators
    .get('MANAGEMENT_APP_LOCATOR')
    ?.useUrl({ sectionId: 'security', appId: 'api_keys' });

  const learnMoreUrl = docLinks.links.fleet.apiKeysLearnMore;

  return <Component {...{ cloudId, managementUrl, learnMoreUrl }} />;
};
