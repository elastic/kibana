/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import React, { FunctionComponent, useEffect, useState, useRef } from 'react';
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
  initialPosition: Position;
}

const PORTAL_HTML_ELEMENT_ID = 'pipelineProcessorsEditorTooltipPortal';

export const PipelineProcessorsItemTooltip: FunctionComponent<Props> = ({
  processor,
  initialPosition,
}) => {
  const [{ x, y }, setPosition] = useState<Position>(initialPosition);
  const mountRef = useRef<HTMLDivElement | undefined>();

  useEffect(() => {
    const mountEl = document.createElement('div');
    mountEl.setAttribute('id', `${PORTAL_HTML_ELEMENT_ID}_${uuid.v4()}`);
    document.body.appendChild(mountEl);
    mountRef.current = mountEl;
    const mouseMoveListener = (event: MouseEvent) => {
      setPosition({ x: event.pageX, y: event.pageY - window.scrollY });
    };

    document.addEventListener('mousemove', mouseMoveListener);
    return () => {
      document.removeEventListener('mousemove', mouseMoveListener);
      document.body.removeChild(mountEl);
    };
  }, []);

  if (!mountRef.current) {
    return null;
  }

  return (
    <EuiPortal
      insert={{
        sibling: mountRef.current,
        position: 'after',
      }}
    >
      <div className="pipelineProcessorsEditor__itemTooltip" style={{ left: x + 20, top: y + 20 }}>
        <ProcessorInformation processor={processor} />
      </div>
    </EuiPortal>
  );
};
