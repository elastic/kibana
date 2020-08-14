/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useEffect, useState } from 'react';
import { EuiPortal } from '@elastic/eui';
import { ProcessorInternal } from '../../types';

import './pipeline_processors_editor_item_toolip.scss';
import { ProcessorInformation } from './processor_information';

export interface Position {
  x: number;
  y: number;
}

interface Props {
  processor: ProcessorInternal;
}

const MOUSE_PADDING_RIGHT = 20;
const MOUSE_PADDING_BOTTOM = 20;

export const PipelineProcessorsItemTooltip: FunctionComponent<Props> = ({ processor }) => {
  const [position, setPosition] = useState<Position | undefined>();

  useEffect(() => {
    const mouseMoveListener = (event: MouseEvent) => {
      setPosition({ x: event.pageX, y: event.pageY - window.scrollY });
    };
    document.addEventListener('mousemove', mouseMoveListener);
    return () => {
      document.removeEventListener('mousemove', mouseMoveListener);
    };
  }, []);

  if (!position) {
    return null;
  }

  return (
    /**
     * To get around issues with parent elements potentially being position: relative or
     * overflow: hidden we use a portal to render this tooltip in the document body so
     * that we can render it anywhere the cursor can go.
     */
    <EuiPortal>
      <div
        className="pipelineProcessorsEditor__itemTooltip"
        style={{
          left: position.x + MOUSE_PADDING_RIGHT,
          top: position.y + MOUSE_PADDING_BOTTOM,
        }}
      >
        <ProcessorInformation processor={processor} />
      </div>
    </EuiPortal>
  );
};
