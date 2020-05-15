/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

 /*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCodeBlock, EuiAccordion } from '@elastic/eui';
import { State } from '../types';
import { nodeRegistry } from '../nodes';
import { useLoader, analyzeDag } from '../state';

export function JsonRenderer(props: { state: State }) {
  const loader = useLoader();
  const analyzed = analyzeDag(props.state);
  return (
    <>
      {analyzed.map(a => (
        <EuiAccordion
          id={a.id}
          key={a.id}
          buttonContent={a.id + ': ' + nodeRegistry[a.node.type].title}
          initialIsOpen={a.isTerminalNode}
        >
          <EuiCodeBlock language="json">
            {JSON.stringify(loader.lastData[a.id]?.value, null, 2)}
          </EuiCodeBlock>
        </EuiAccordion>
      ))}
    </>
  );
}
