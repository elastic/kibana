/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiAccordion } from '@elastic/eui';
import { formatters } from 'jsondiffpatch';

import { RecordedAction } from '../types';

interface Props {
  action: RecordedAction | null;
}

export const StateChange: FC<Props> = ({ action }) => {
  if (!action) {
    return null;
  }

  const { change, previousState } = action;
  const html = formatters.html.format(change, previousState);
  formatters.html.hideUnchanged();

  return (
    <EuiAccordion
      className="panel__stateChange"
      id="state_change"
      initialIsOpen={true}
      buttonContent="State Change"
    >
      {/* eslint-disable-next-line react/no-danger */}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </EuiAccordion>
  );
};
