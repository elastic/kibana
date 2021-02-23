/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { formatErrors } from '../../../../common/format_errors';
import { exactCheck } from '../../../../common/exact_check';
import {
  addPrepackagedRulesSchema,
  AddPrepackagedRulesSchema,
  AddPrepackagedRulesSchemaDecoded,
} from '../../../../common/detection_engine/schemas/request/add_prepackaged_rules_schema';
import { BadRequestError } from '../errors/bad_request_error';
import {
  getAsset,
  getPathParts,
  getRegistryPackage,
  fetchFindLatestPackage,
} from '../../../../../fleet/server';

import { rawRules } from './prepackaged_rules';
import { DETECTION_RULES_PACKAGE_NAME } from './constants';

let latestRulesPackageVersion: string | undefined;
let latestRulesDownload: AddPrepackagedRulesSchemaDecoded[];
let usePackageRegistryRules = false;

/**
 * Enable retrieval of rules from the Elastic Package Registry.
 */
export const enablePackageRegistryRules = () => {
  usePackageRegistryRules = true;
};

/**
 * Validate the rules from the file system and throw any errors indicating to the developer
 * that they are adding incorrect schema rules. Also this will auto-flush in all the default
 * aspects such as default interval of 5 minutes, default arrays, etc...
 */
export const validateAllPrepackagedRules = (
  rules: AddPrepackagedRulesSchema[]
): AddPrepackagedRulesSchemaDecoded[] => {
  return rules.map((rule) => {
    const decoded = addPrepackagedRulesSchema.decode(rule);
    const checked = exactCheck(rule, decoded);

    const onLeft = (errors: t.Errors): AddPrepackagedRulesSchemaDecoded => {
      const ruleName = rule.name ? rule.name : '(rule name unknown)';
      const ruleId = rule.rule_id ? rule.rule_id : '(rule rule_id unknown)';
      throw new BadRequestError(
        `name: "${ruleName}", rule_id: "${ruleId}" within the folder rules/prepackaged_rules ` +
          `is not a valid detection engine rule. Expect the system ` +
          `to not work with pre-packaged rules until this rule is fixed ` +
          `or the file is removed. Error is: ${formatErrors(
            errors
          ).join()}, Full rule contents are:\n${JSON.stringify(rule, null, 2)}`
      );
    };

    const onRight = (schema: AddPrepackagedRulesSchema): AddPrepackagedRulesSchemaDecoded => {
      return schema as AddPrepackagedRulesSchemaDecoded;
    };
    return pipe(checked, fold(onLeft, onRight));
  });
};

const isRuleTemplate = (path: string) => {
  const pathParts = getPathParts(path);
  return pathParts.type === 'rules' && pathParts.file !== 'CHANGELOG.json';
};

// non-blocking check the latest version
export const getLatestRulesPackageVersion = (): string | undefined => {
  // kick off a background check for the latest package version.
  // next time this is called, it might point to the latest.
  // for on-prem, EPR is not reachable, but we don't want to timeout waiting to connect
  checkAndStageUpdate();

  // return the most recently known version
  return latestRulesPackageVersion;
};

/**
 * Retrieve a package of rules from the Elastic Package Registry.
 * @param pkgVersion Specific package version to retrieve from EPR
 */
export const getPackageRegistryRules = async (
  pkgVersion: string
): Promise<AddPrepackagedRulesSchemaDecoded[]> => {
  if (pkgVersion === latestRulesPackageVersion) {
    return latestRulesDownload;
  }

  const { paths } = await getRegistryPackage(DETECTION_RULES_PACKAGE_NAME, pkgVersion);

  const rulePaths = paths.filter(isRuleTemplate);
  const rulePromises = rulePaths.map<AddPrepackagedRulesSchema>((path) => {
    return JSON.parse(getAsset(path).toString('utf8'));
  });

  return validateAllPrepackagedRules(rulePromises);
};

/**
 * Retrieve and decode a package of rules compiled in from the file system.
 * @param rules List of rules to use instead
 */
export const getFileSystemRules = (
  rules: AddPrepackagedRulesSchema[] = []
): AddPrepackagedRulesSchemaDecoded[] => {
  if (!rules || rules.length === 0) {
    // @ts-expect-error mock data is too loosely typed
    return validateAllPrepackagedRules(rawRules);
  }

  return validateAllPrepackagedRules(rules);
};

/**
 * Check for the latest rules package in the registry, and download if it's an update.
 */
export const checkAndStageUpdate = async () => {
  if (!usePackageRegistryRules) {
    return;
  }

  try {
    const registryPackage = await fetchFindLatestPackage(DETECTION_RULES_PACKAGE_NAME);
    if (!latestRulesPackageVersion || registryPackage.version !== latestRulesPackageVersion) {
      // automatically download and cache the latest in memory
      const downloaded = await getPackageRegistryRules(registryPackage.version);

      latestRulesDownload = downloaded;
      latestRulesPackageVersion = registryPackage.version; // eslint-disable-line require-atomic-updates
    }
  } catch (error) {
    // console.warn(error);
  }
};

/**
 * Retrieve a package from the registry if available, otherwise fallback to the file system.
 * @param pkgVersion Retrieve a specific package from the registry by version.
 */
export const getRegistryOrFileSystemRules = async (
  pkgVersion?: string
): Promise<AddPrepackagedRulesSchemaDecoded[]> => {
  if (!pkgVersion) {
    return getFileSystemRules();
  }

  // require pinning to a specific package version, otherwise the "X updates available" dialog
  // could be out of date
  return getPackageRegistryRules(pkgVersion);
};
