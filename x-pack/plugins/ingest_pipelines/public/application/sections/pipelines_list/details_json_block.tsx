/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useRef } from 'react';
import { EuiCodeBlock } from '@elastic/eui';

export interface Props {
  json: Record<string, any>;
}

export const PipelineDetailsJsonBlock: FunctionComponent<Props> = ({ json }) => {
  // Hack so copied-to-clipboard value updates as content changes
  // Related issue: https://github.com/elastic/eui/issues/3321
  const uuid = useRef(0);
  uuid.current++;

  return (
    <EuiCodeBlock
      paddingSize="s"
      language="json"
      overflowHeight={json.length > 0 ? 300 : undefined}
      isCopyable
      key={uuid.current}
    >
      {JSON.stringify(json, null, 2)}
    </EuiCodeBlock>
  );
};
