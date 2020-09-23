/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export { mockHistory, mockLocation } from './react_router_history.mock';
export { mockKibanaContext } from './kibana_context.mock';
export { mockKibanaValues } from './kibana_logic.mock';
export { mockLicensingValues } from './licensing_logic.mock';
export { mockHttpValues } from './http_logic.mock';
export { mockFlashMessagesValues, mockFlashMessagesActions } from './flash_messages_logic.mock';
export { mockAllValues, mockAllActions, setMockValues } from './kea.mock';

export {
  mountWithContext,
  mountWithKibanaContext,
  mountWithAsyncContext,
} from './mount_with_context.mock';
export { shallowWithIntl } from './shallow_with_i18n.mock';

// Note: shallow_usecontext must be imported directly as a file
