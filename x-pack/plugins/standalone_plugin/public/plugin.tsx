/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

const Shell = () => {
  return (
    <div
      ref={(element) => {
        if (element) {
          const script = document.createElement('script');
          script.src = 'http://localhost:5601/standalone.js';
          script.onload = () => {
            const host = document.createElement('div');
            element.appendChild(host);
            (window as any).StandalonePlugin(host, {
              // eslint-disable-next-line no-console
              data: { search: () => console.info('called kibana search api from external plugin') },
            });
          };
          element.appendChild(script);
        }
      }}
    />
  );
};

export class StandalonePlugin implements Plugin<void, void, SetupDeps> {
  public setup(core: CoreSetup, deps: SetupDeps) {
    // Register an application into the side navigation menu
    core.application.register({
      id: 'standalonePlugin',
      title: 'Standalone Plugin demo',

      async mount({ element }: AppMountParameters) {
        ReactDOM.render(<Shell />, element);

        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });

    // This section is only needed to get this example plugin to show up in our Developer Examples.
    deps.developerExamples.register({
      appId: 'standalonePlugin',
      title: 'Standalone Application',
      description: `Build a plugin that registers a standalone application that simply says "Hello World"`,
    });
  }
  public start(core: CoreStart) {
    return {};
  }
  public stop() {}
}
