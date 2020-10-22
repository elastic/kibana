/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IUiSettingsClient } from 'kibana/server';
import { EsQueryConfig } from 'src/plugins/data/server';
import { TimeRangeParams } from '../../common';
import { GenerateCsvParams } from '../../csv/generate_csv';
import {
  JobParamsPanelCsv,
  SavedSearchObjectAttributes,
  SearchPanel,
  SearchSource,
} from '../types';

export const getEsQueryConfig = async (config: IUiSettingsClient) => {
  const configs = await Promise.all([
    config.get('query:allowLeadingWildcards'),
    config.get('query:queryString:options'),
    config.get('courier:ignoreFilterIfFieldNotInIndex'),
  ]);
  const [allowLeadingWildcards, queryStringOptions, ignoreFilterIfFieldNotInIndex] = configs;
  return {
    allowLeadingWildcards,
    queryStringOptions,
    ignoreFilterIfFieldNotInIndex,
  } as EsQueryConfig;
};

/*
 * Create a CSV Job object for CSV From SavedObject to use as a job parameter
 * for generateCsv
 */
export const getGenerateCsvParams = async (
  jobParams: JobParamsPanelCsv,
  panel: SearchPanel
): Promise<GenerateCsvParams> => {
  let timerange: TimeRangeParams | null;
  if (jobParams.post?.timerange) {
    timerange = jobParams.post?.timerange;
  } else {
    timerange = panel.timerange || null;
  }
  const savedSearchObjectAttr = panel.attributes as SavedSearchObjectAttributes;
  const {
    kibanaSavedObjectMeta: { searchSource: searchSource },
  } = savedSearchObjectAttr as { kibanaSavedObjectMeta: { searchSource: SearchSource } };

  return {
    browserTimezone: timerange?.timezone,
    searchSource,
  };
};
