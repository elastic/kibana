/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../common/translations';
export {
  UPDATE_THIRD,
  PUSH_THIRD,
  PUSH_LOCKED_TITLE,
  PUSH_LOCKED_DESC,
} from '../use_push_to_service/translations';

export const EDIT_CONNECTOR_ARIA = i18n.translate(
  'xpack.cases.editConnector.editConnectorLinkAria',
  {
    defaultMessage: 'click to edit connector',
  }
);
