/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { render } from 'react-dom';
import { Datasource, Visualization, EditorFrameAPI } from './types';

function EditorFrameComponent(props: {
  datasources: Array<Datasource<unknown>>;
  visualizations: Array<Visualization<unknown>>;
}) {
  const renderDatasource = (datasource: Datasource<unknown>) => {
    return useCallback(
      node => {
        datasource.renderDataPanel({
          domElement: node,
        });
      },
      [datasource]
    );
  };

  return (
    <div>
      <h2>Editor Frame</h2>

      {props.datasources.map((datasource, index) => (
        <div key={index} ref={renderDatasource(datasource)} />
      ))}
    </div>
  );
}

class EditorFrame {
  constructor() {}

  private datasources: Array<Datasource<unknown>> = [];
  private visualizations: Array<Visualization<unknown>> = [];

  public setup(): EditorFrameAPI {
    return {
      render: (domElement: Element) => {
        render(
          <EditorFrameComponent
            datasources={this.datasources}
            visualizations={this.visualizations}
          />,
          domElement
        );
      },
      registerDatasource: (datasource: Datasource<unknown>) => {
        this.datasources.push(datasource);
      },
      registerVisualization: (visualization: Visualization<unknown>) => {
        this.visualizations.push(visualization);
      },
    };
  }

  public stop() {
    return {};
  }
}

export { EditorFrame };

export const editorFrame = new EditorFrame().setup();
