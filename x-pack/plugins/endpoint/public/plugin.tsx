/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, AppMountContext, AppMountParameters } from 'kibana/public';

const template = `
<label>subtype filter: <input type="text" id="subtype-filter" /></label>
<h1>results</h1><code id="results"></code>
`;

export class EndpointPlugin implements Plugin<EndpointPluginSetup, EndpointPluginStart> {
  public setup(core: CoreSetup) {
    core.application.register({
      id: 'endpoint',
      title: 'Endpoint',
      async mount(context: AppMountContext, params: AppMountParameters) {
        const appElement = document.createElement('p');

        appElement.innerHTML = template;

        syncQuery(context);

        params.element.appendChild(appElement);

        return function() {
          if (appElement.parentNode) {
            appElement.parentNode.removeChild(appElement);
          }
        };
      },
    });

    // I think this exposes APIs to other plugins.
    return {};
  }

  public start() {}
  public stop() {}
}

export type EndpointPluginSetup = ReturnType<EndpointPlugin['setup']>;
export type EndpointPluginStart = ReturnType<EndpointPlugin['start']>;

// Continually sync the UI with the query as entered
async function syncQuery(context) {
  let lastSubtypeFilter = null;
  while (true) {
    await delay(1000);

    if (subtypeFilter() !== lastSubtypeFilter) {
      lastSubtypeFilter = subtypeFilter();
      try {
        const response = await context.core.http.get('/events', {
          query: {
            subtype: lastSubtypeFilter,
          },
        });

        document.getElementById('results').textContent = JSON.stringify(
          response.elasticsearchResponse.hits.hits
        );
      } catch (error) {
        /* eslint-disable no-console */
        console.log(error);
        /* eslint-enable no-console */
      }
    }
  }
  function subtypeFilter() {
    return document.getElementById('subtype-filter').value;
  }
  function delay(time) {
    return new Promise(function(resolve) {
      setTimeout(resolve, time);
    });
  }
}
