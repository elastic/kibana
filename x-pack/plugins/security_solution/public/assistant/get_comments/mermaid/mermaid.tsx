/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MermaidConfig } from 'mermaid';
import mermaid from 'mermaid';
import React, { useEffect } from 'react';
import { defaultMermaidConfig } from './config';

export interface MermaidProps {
  chart: string;
  config?: Partial<MermaidConfig>;
}

const MermaidComponent: React.FC<MermaidProps> = ({ chart, config }) => {
  useEffect(() => {
    mermaid.initialize(Object.assign(defaultMermaidConfig, config));
    mermaid.contentLoaded();
  }, [config]);

  return <div className="mermaid">{chart}</div>;
};

MermaidComponent.displayName = 'Mermaid';

export const Mermaid = React.memo(MermaidComponent);

// Necessary for React.lazy
// eslint-disable-next-line import/no-default-export
export default Mermaid;
