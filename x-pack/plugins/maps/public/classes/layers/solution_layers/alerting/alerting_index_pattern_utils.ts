/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import minimatch from 'minimatch';
import { getIndexPatternService, getUiSettings } from '../../../../kibana_services';

export type IndexPatternMeta = {
  id: string;
  title: string;
};

export async function getAlertingIndexPatterns(): Promise<IndexPatternMeta[]> {
  const uiSettings = getUiSettings();
  let securityIndexPatternTitles: string[];
  try {
    securityIndexPatternTitles = uiSettings.get('securitySolution:defaultIndex');
  } catch (error) {
    return [];
  }

  const indexPatternCache = await getIndexPatternService().getCache();
  return indexPatternCache!
    .filter((savedObject) => {
      return (securityIndexPatternTitles as string[]).some((indexPatternTitle) => {
        // glob matching index pattern title
        return minimatch(indexPatternTitle, savedObject?.attributes?.title);
      });
    })
    .map((savedObject) => {
      return {
        id: savedObject.id,
        title: savedObject.attributes.title,
      };
    });
}
