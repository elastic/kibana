/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import minimatch from 'minimatch';
import { IndexPattern } from 'src/plugins/data/public';
import { SimpleSavedObject } from 'src/core/public';
import { getIndexPatternService, getUiSettings } from '../../../../kibana_services';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IndexPatternSavedObjectAttrs } from '../../../../../../../../src/plugins/data/public/index_patterns/index_patterns/index_patterns';

const SIEM_DEFAULT_INDEX = 'siem:defaultIndex';

let indexPatterns: IndexPattern[];
let indexPatternsPromise: Promise<IndexPattern[]>;

export async function getSecurityIndexPatterns(): Promise<IndexPattern[]> {
  if (indexPatterns) {
    return indexPatterns;
  }

  if (!indexPatternsPromise) {
    indexPatternsPromise = loadSecurityIndexPatterns();
  }

  return indexPatternsPromise;
}

async function loadSecurityIndexPatterns(): Promise<IndexPattern[]> {
  const securityIndexPatternTitles = getUiSettings().get(SIEM_DEFAULT_INDEX) as string[];
  const indexPatternCache = await getIndexPatternService().getCache();
  const promises = indexPatternCache!
    .filter((savedObject: SimpleSavedObject<IndexPatternSavedObjectAttrs>) => {
      return securityIndexPatternTitles.some((indexPatternTitle) => {
        // glob matching index pattern title
        return minimatch(indexPatternTitle, savedObject?.attributes?.title);
      });
    })
    .map(async (savedObject: SimpleSavedObject<IndexPatternSavedObjectAttrs>) => {
      return await getIndexPatternService().get(savedObject.id);
    });

  return await Promise.all(promises);
}
