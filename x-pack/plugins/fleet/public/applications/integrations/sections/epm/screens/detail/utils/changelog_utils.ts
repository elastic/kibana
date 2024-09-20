/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { load } from 'js-yaml';

import semverGte from 'semver/functions/gte';
import semverLte from 'semver/functions/lte';

import type { ChangeLogParams } from '../settings/changelog_modal';

export const formatChangelog = (parsedChangelog: ChangeLogParams[]) => {
  if (!parsedChangelog) return '';

  return parsedChangelog.reduce((acc, val) => {
    acc += `Version: ${val.version}\nChanges:\n  Type: ${val.changes[0].type}\n  Description: ${val.changes[0].description}\n  Link: ${val.changes[0].link}\n\n`;
    return acc;
  }, '');
};

// Exported for testing
export const filterYamlChangelog = (
  changelogText: string | null | undefined,
  latestVersion: string,
  currentVersion?: string
) => {
  const parsedChangelog: ChangeLogParams[] = changelogText ? load(changelogText) : [];

  if (!currentVersion) return parsedChangelog.filter((e) => semverLte(e.version, latestVersion));

  return parsedChangelog.filter(
    (e) => semverLte(e.version, latestVersion) && semverGte(e.version, currentVersion)
  );
};

export const getFormattedChangelog = (
  changelogText: string | null | undefined,
  latestVersion: string,
  currentVersion?: string
) => {
  const parsed = filterYamlChangelog(changelogText, latestVersion, currentVersion);
  return formatChangelog(parsed);
};
