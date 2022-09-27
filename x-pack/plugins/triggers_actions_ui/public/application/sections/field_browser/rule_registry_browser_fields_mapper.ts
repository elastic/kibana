/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BrowserField as TriggersActionsUiBrowserField,
  BrowserFields as TriggersActionsUiBrowserFields,
} from '@kbn/rule-registry-plugin/common';
import { BrowserFields as LegacyBrowserFields } from './types';

export const ruleRegistryBrowserFieldsMapper = (
  browserFields: LegacyBrowserFields
): TriggersActionsUiBrowserFields => {
  return Object.keys(browserFields).reduce(
    (acc: TriggersActionsUiBrowserFields, category: string) => {
      if (!browserFields[category].fields) return acc;

      acc[category] = {
        fields: browserFields[category].fields as {
          [fieldName: string]: TriggersActionsUiBrowserField;
        },
      };

      return acc;
    },
    {}
  );
};
