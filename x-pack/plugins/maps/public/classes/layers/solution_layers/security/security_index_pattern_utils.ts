/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import minimatch from 'minimatch';
import { SimpleSavedObject } from 'src/core/public';
import { getIndexPatternService, getUiSettings } from '../../../../kibana_services';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IndexPatternSavedObjectAttrs } from '../../../../../../../../src/plugins/data/public/index_patterns/index_patterns/index_patterns';

const SIEM_DEFAULT_INDEX = 'siem:defaultIndex';

export type IndexPatternMeta = {
  id: string;
  title: string;
};

let indexPatterns: IndexPatternMeta[];
let indexPatternsPromise: Promise<IndexPatternMeta[]>;

export async function getSecurityIndexPatterns(): Promise<IndexPatternMeta[]> {
  if (indexPatterns) {
    return indexPatterns;
  }

  if (!indexPatternsPromise) {
    indexPatternsPromise = loadSecurityIndexPatterns();
  }

  return indexPatternsPromise;
}

async function loadSecurityIndexPatterns(): Promise<IndexPatternMeta[]> {
  const securityIndexPatternTitles = getUiSettings().get(SIEM_DEFAULT_INDEX) as string[];
  const indexPatternCache = await getIndexPatternService().getCache();
  return indexPatternCache!
    .filter((savedObject: SimpleSavedObject<IndexPatternSavedObjectAttrs>) => {
      return securityIndexPatternTitles.some((indexPatternTitle) => {
        // glob matching index pattern title
        return minimatch(indexPatternTitle, savedObject?.attributes?.title);
      });
    })
    .map((savedObject: SimpleSavedObject<IndexPatternSavedObjectAttrs>) => {
      return {
        id: savedObject.id,
        title: savedObject.attributes.title,
      };
    });
}
