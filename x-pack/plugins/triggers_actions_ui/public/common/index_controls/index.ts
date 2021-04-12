/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { HttpSetup } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import {
  loadIndexPatterns,
  getMatchingIndices,
  getESIndexFields,
  getSavedObjectsClient,
} from '../lib/data_apis';

export interface IOption {
  label: string;
  options: Array<{ value: string; label: string }>;
}

export const getIndexPatterns = async () => {
  // TODO: Implement a possibility to retrive index patterns different way to be able to expose this in consumer plugins
  if (getSavedObjectsClient()) {
    const indexPatternObjects = await loadIndexPatterns();
    return indexPatternObjects.map((indexPattern: any) => indexPattern.attributes.title);
  }
  return [];
};

export const getIndexOptions = async (
  http: HttpSetup,
  pattern: string,
  indexPatternsParam: string[]
) => {
  const options: IOption[] = [];

  if (!pattern) {
    return options;
  }

  const matchingIndices = (await getMatchingIndices({
    pattern,
    http,
  })) as string[];
  const matchingIndexPatterns = indexPatternsParam.filter((anIndexPattern) => {
    return anIndexPattern.includes(pattern);
  }) as string[];

  if (matchingIndices.length || matchingIndexPatterns.length) {
    const matchingOptions = uniq([...matchingIndices, ...matchingIndexPatterns]);

    options.push({
      label: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.indicesAndIndexPatternsLabel',
        {
          defaultMessage: 'Based on your index patterns',
        }
      ),
      options: matchingOptions.map((match) => {
        return {
          label: match,
          value: match,
        };
      }),
    });
  }

  options.push({
    label: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.chooseLabel',
      {
        defaultMessage: 'Choose…',
      }
    ),
    options: [
      {
        value: pattern,
        label: pattern,
      },
    ],
  });

  return options;
};

export const getFields = async (http: HttpSetup, indexes: string[]) => {
  return await getESIndexFields({ indexes, http });
};

export const firstFieldOption = {
  text: i18n.translate(
    'xpack.triggersActionsUI.sections.alertAdd.indexControls.timeFieldOptionLabel',
    {
      defaultMessage: 'Select a field',
    }
  ),
  value: '',
};
