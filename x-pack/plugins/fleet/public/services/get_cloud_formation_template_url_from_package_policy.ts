/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicy } from '../types';

/**
 * Get the cloud formation template url from a package policy
 * It looks for a config with a cloud_formation_template_url object present in
 * the enabled inputs of the package policy
 */
export const getCloudFormationTemplateUrlFromPackagePolicy = (selectedPolicy?: AgentPolicy) => {
  const cloudFormationTemplateUrl = selectedPolicy?.package_policies?.reduce(
    (acc, packagePolicy) => {
      const findCloudFormationTemplateUrlConfig = packagePolicy.inputs?.reduce(
        (accInput, input) => {
          if (input?.enabled && input?.config?.cloud_formation_template_url) {
            return input.config.cloud_formation_template_url.value;
          }
          return accInput;
        },
        ''
      );
      if (findCloudFormationTemplateUrlConfig) {
        return findCloudFormationTemplateUrlConfig;
      }
      return acc;
    },
    ''
  );
  return cloudFormationTemplateUrl !== '' ? cloudFormationTemplateUrl : undefined;
};
