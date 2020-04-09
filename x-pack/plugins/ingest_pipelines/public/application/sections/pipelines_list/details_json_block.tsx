/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiCodeBlock, EuiText } from '@elastic/eui';

export interface Props {
  htmlForId: string;
  label: string;
  json: Record<string, any>;
}

export const PipelineDetailsJsonBlock: FunctionComponent<Props> = ({ label, htmlForId, json }) => (
  <>
    <EuiText size="s">
      <label htmlFor={htmlForId}>
        <b>{label}</b>
      </label>
    </EuiText>
    <EuiCodeBlock paddingSize="s" id={htmlForId} language="json" overflowHeight={200} isCopyable>
      {JSON.stringify(json, null, 2)}
    </EuiCodeBlock>
  </>
);
