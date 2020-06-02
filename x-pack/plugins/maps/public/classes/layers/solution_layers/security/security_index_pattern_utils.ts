/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import minimatch from 'minimatch';
import { getIndexPatternService, getUiSettings } from '../../../../kibana_services';

const SIEM_DEFAULT_INDEX = 'siem:defaultIndex';

export type IndexPatternMeta = {
  id: string;
  title: string;
};

export async function getSecurityIndexPatterns(): IndexPatternMeta[] {
  const securityIndexPatternTitles = getUiSettings().get(SIEM_DEFAULT_INDEX) as string[];
  const indexPatternCache = await getIndexPatternService().getCache();
  return indexPatternCache
    .filter((savedObject) => {
      return securityIndexPatternTitles.some((indexPatternTitle) => {
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
