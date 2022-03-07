/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { HttpSetup } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { loadIndexPatterns, getMatchingIndices, getESIndexFields } from '../lib/data_apis';

export interface IOption {
  label: string;
  options: Array<{ value: string; label: string }>;
}

export const getIndexOptions = async (http: HttpSetup, pattern: string) => {
  const options: IOption[] = [];

  if (!pattern) {
    return options;
  }

  const [matchingIndices, matchingIndexPatterns] = await Promise.all([
    getMatchingIndices({
      pattern,
      http,
    }),
    loadIndexPatterns(pattern),
  ]);

  if (matchingIndices.length || matchingIndexPatterns.length) {
    const matchingOptions = uniq([...(matchingIndices as string[]), ...matchingIndexPatterns]);

    options.push({
      label: i18n.translate(
        'xpack.triggersActionsUI.components.builtinActionTypes.indexAction.indicesAndIndexPatternsLabel',
        {
          defaultMessage: 'Based on your data views',
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
    'xpack.triggersActionsUI.sections.ruleAdd.indexControls.timeFieldOptionLabel',
    {
      defaultMessage: 'Select a field',
    }
  ),
  value: '',
};
