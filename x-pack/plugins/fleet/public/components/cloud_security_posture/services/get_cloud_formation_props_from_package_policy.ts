/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CloudFormationProps,
  CloudSecurityIntegrationAwsAccountType,
} from '../../agent_enrollment_flyout/types';
import type { PackagePolicy } from '../../../types';

const AWS_ACCOUNT_TYPE = 'aws.account_type';

/**
 * Get the cloud formation template url from a package policy
 * It looks for a config with a cloud_formation_template_url object present in
 * the enabled inputs of the package policy
 */
export const getCloudFormationPropsFromPackagePolicy = (
  packagePolicy?: PackagePolicy
): CloudFormationProps => {
  const templateUrl = packagePolicy?.inputs?.reduce((accInput, input) => {
    if (accInput !== '') {
      return accInput;
    }
    if (input?.enabled && input?.config?.cloud_formation_template_url) {
      return input.config.cloud_formation_template_url.value;
    }
    return accInput;
  }, '');

  const awsAccountType: CloudSecurityIntegrationAwsAccountType | undefined =
    packagePolicy?.inputs?.find((input) => input.enabled)?.streams?.[0]?.vars?.[AWS_ACCOUNT_TYPE]
      ?.value;

  return {
    templateUrl: templateUrl !== '' ? templateUrl : undefined,
    awsAccountType,
  };
};
