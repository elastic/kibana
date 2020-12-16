/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import { CallOutMessage } from './callout_types';

export interface CallOutDescriptionProps {
  messages: CallOutMessage | CallOutMessage[];
}

export const CallOutDescription: FC<CallOutDescriptionProps> = ({ messages }) => {
  if (!Array.isArray(messages)) {
    return messages.description;
  }

  if (messages.length < 1) {
    return null;
  }

  return <EuiDescriptionList listItems={messages} />;
};
