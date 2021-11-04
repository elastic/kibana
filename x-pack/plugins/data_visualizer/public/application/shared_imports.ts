/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { EuiCodeEditor } from '../../../../../src/plugins/es_ui_shared/public';
export type { EuiCodeEditorProps } from '../../../../../src/plugins/es_ui_shared/public';

import { XJson } from '../../../../../src/plugins/es_ui_shared/public';
const { collapseLiteralStrings, expandLiteralStrings } = XJson;

export { XJsonMode } from '@kbn/ace';
export { collapseLiteralStrings, expandLiteralStrings };
