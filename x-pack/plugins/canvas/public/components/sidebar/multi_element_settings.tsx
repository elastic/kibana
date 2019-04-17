/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiAccordion, EuiText } from '@elastic/eui';
import { ElementSettings } from './element_settings';

interface Props {
  selectedToplevelNodes: string[];
}

export const MultiElementSettings: FunctionComponent<Props> = ({ selectedToplevelNodes }) => (
  <>
    {selectedToplevelNodes.map((elementId: string) => {
      // skip groups for now
      if (elementId.includes('group')) {
        return null;
      }

      return (
        <EuiAccordion
          id={`element-config-${elementId}`}
          key={`element-config-${elementId}`}
          buttonContent={
            <EuiText size="s" color="subdued">
              {elementId}
            </EuiText>
          }
        >
          <ElementSettings selectedElementId={elementId} />
        </EuiAccordion>
      );
    })}
  </>
);
