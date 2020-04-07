/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useState } from 'react';
import { XJsonMode } from '../../../../../../src/plugins/es_ui_shared/console_lang/ace/modes/x_json';
import {
  collapseLiteralStrings,
  expandLiteralStrings,
} from '../../../../../../src/plugins/es_ui_shared/console_lang/lib';
// @ts-ignore
export const xJsonMode = new XJsonMode();
export const useXJsonMode = (json: Record<string, any> | null) => {
  const [xJson, setXJson] = useState(
    json === null ? '' : expandLiteralStrings(JSON.stringify(json, null, 2))
  );

  return {
    xJson,
    setXJson,
    xJsonMode,
    convertToJson: collapseLiteralStrings,
  };
};
