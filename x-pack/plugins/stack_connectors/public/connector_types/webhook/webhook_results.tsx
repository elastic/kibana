/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { WebhookActionParams } from '../types';

const WebhookResultsFields: React.FunctionComponent<ActionParamsProps<WebhookActionParams>> = (
  props
) => {
  return <div> {props.action.message}</div>;
};

// eslint-disable-next-line import/no-default-export
export { WebhookResultsFields as default };
