/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { safeLoad } from 'js-yaml';

import type { ChangeLogParams } from '../settings/changelog_modal';

export const formatChangelog = (parsedChangelog: ChangeLogParams[]) => {
  if (!parsedChangelog) return '';

  return parsedChangelog.reduce((acc, val) => {
    acc += `Version: ${val.version}\nChanges:\n  Type: ${val.changes[0].type}\n  Description: ${val.changes[0].description}\n  Link: ${val.changes[0].link}\n\n`;
    return acc;
  }, '');
};

export const parseYamlChangelog = (
  changelogText: string | null | undefined,
  currentVersion: string,
  latestVersion: string
) => {
  const parsedChangelog: ChangeLogParams[] = changelogText ? safeLoad(changelogText) : [];

  const filtered = parsedChangelog.filter(
    (e) => e.version === latestVersion || e.version === currentVersion //TO DO: all the entries between the two versions
  );
  return formatChangelog(filtered);
};
