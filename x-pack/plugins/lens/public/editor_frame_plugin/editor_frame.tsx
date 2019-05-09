/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Datasource, Visualization } from '../types';
import { NativeRenderer } from '../native_renderer';

interface EditorFrameProps {
  datasources: { [key: string]: Datasource };
  visualizations: { [key: string]: Visualization };
}

export function EditorFrame(props: EditorFrameProps) {
  const keys = Object.keys(props.datasources);

  return (
    <div>
      <h2>Editor Frame</h2>

      {keys.map(key => (
        <NativeRenderer
          key={key}
          render={props.datasources[key].renderDataPanel}
          nativeProps={{
            state: {},
            setState: () => {},
          }}
        />
      ))}
    </div>
  );
}
