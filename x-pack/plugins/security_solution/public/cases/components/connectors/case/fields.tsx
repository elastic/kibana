/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ActionParamsProps } from '../../../../../../triggers_actions_ui/public/types';

const CaseParamsFields: React.FunctionComponent<ActionParamsProps<CaseActionParams>> = ({
  actionParams,
  editAction,
  index,
  errors,
  messageVariables,
  actionConnector,
  http,
  toastNotifications,
}) => {};

// eslint-disable-next-line import/no-default-export
export { CaseParamsFields as default };
