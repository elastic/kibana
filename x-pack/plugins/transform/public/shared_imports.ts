/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export { createSavedSearchesLoader } from '../../../../src/plugins/discover/public';
export { XJsonMode } from '../../es_ui_shared/console_lang/ace/modes/x_json';
export {
  collapseLiteralStrings,
  expandLiteralStrings,
} from '../../../../src/plugins/es_ui_shared/console_lang/lib';

export {
  UseRequestConfig,
  useRequest,
} from '../../../../src/plugins/es_ui_shared/public/request/np_ready_request';

export { getErrorMessage } from '../../ml/common/util/errors';
