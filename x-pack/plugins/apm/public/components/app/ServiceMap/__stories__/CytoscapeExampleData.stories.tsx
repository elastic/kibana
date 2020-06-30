/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable no-console */

import {
  EuiButton,
  EuiCodeEditor,
  EuiFieldNumber,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { storiesOf } from '@storybook/react';
import React, { useEffect, useState } from 'react';
import { EuiThemeProvider } from '../../../../../../observability/public';
import { Cytoscape } from '../Cytoscape';
import exampleResponseHipsterStore from './example_response_hipster_store.json';
import exampleResponseOpbeansBeats from './example_response_opbeans_beats.json';
import exampleResponseTodo from './example_response_todo.json';
import exampleResponseOneDomainManyIPs from './example_response_one_domain_many_ips.json';
import { generateServiceMapElements } from './generate_service_map_elements';

const STORYBOOK_PATH = 'app/ServiceMap/Cytoscape/Example data';

const SESSION_STORAGE_KEY = `${STORYBOOK_PATH}/pre-loaded map`;
function getSessionJson() {
  return window.sessionStorage.getItem(SESSION_STORAGE_KEY);
}
function setSessionJson(json: string) {
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, json);
}

storiesOf(STORYBOOK_PATH, module)
  .addDecorator((storyFn) => <EuiThemeProvider>{storyFn()}</EuiThemeProvider>)
  .add(
    'Generate map',
    () => {
      const [size, setSize] = useState<number>(10);
      const [json, setJson] = useState<string>('');
      const [elements, setElements] = useState<any[]>(
        generateServiceMapElements(size)
      );

      return (
        <div>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButton
                onClick={() => {
                  setElements(generateServiceMapElements(size));
                  setJson('');
                }}
              >
                Generate service map
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiToolTip position="right" content="Number of services">
                <EuiFieldNumber
                  placeholder="Size"
                  value={size}
                  onChange={(e) => setSize(e.target.valueAsNumber)}
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButton
                onClick={() => {
                  setJson(JSON.stringify({ elements }, null, 2));
                }}
              >
                Get JSON
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>

          <Cytoscape elements={elements} height={600} width={1340} />

          {json && (
            <EuiCodeEditor
              mode="json"
              theme="github"
              width="100%"
              value={json}
              setOptions={{ fontSize: '12px' }}
              isReadOnly
            />
          )}
        </div>
      );
    },
    {
      info: { propTables: false, source: false },
    }
  );

storiesOf(STORYBOOK_PATH, module)
  .addDecorator((storyFn) => <EuiThemeProvider>{storyFn()}</EuiThemeProvider>)
  .add(
    'Map from JSON',
    () => {
      const [json, setJson] = useState<string>(
        getSessionJson() || JSON.stringify(exampleResponseTodo, null, 2)
      );
      const [error, setError] = useState<string | undefined>();

      const [elements, setElements] = useState<any[]>([]);
      useEffect(() => {
        try {
          setElements(JSON.parse(json).elements);
        } catch (e) {
          setError(e.message);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      return (
        <div>
          <Cytoscape elements={elements} height={600} width={1340} />
          <EuiForm isInvalid={error !== undefined} error={error}>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiCodeEditor
                  mode="json"
                  theme="github"
                  width="100%"
                  value={json}
                  setOptions={{ fontSize: '12px' }}
                  onChange={(value) => {
                    setJson(value);
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup direction="column">
                  <EuiFilePicker
                    display={'large'}
                    fullWidth={true}
                    style={{ height: '100%' }}
                    initialPromptText="Upload a JSON file"
                    onChange={(event) => {
                      const item = event?.item(0);

                      if (item) {
                        const f = new FileReader();
                        f.onload = (onloadEvent) => {
                          const result = onloadEvent?.target?.result;
                          if (typeof result === 'string') {
                            setJson(result);
                          }
                        };
                        f.readAsText(item);
                      }
                    }}
                  />
                  <EuiSpacer />
                  <EuiButton
                    onClick={() => {
                      try {
                        setElements(JSON.parse(json).elements);
                        setSessionJson(json);
                        setError(undefined);
                      } catch (e) {
                        setError(e.message);
                      }
                    }}
                  >
                    Render JSON
                  </EuiButton>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiForm>
        </div>
      );
    },
    {
      info: {
        propTables: false,
        source: false,
        text: `
      Enter JSON map data into the text box or upload a file and click "Render JSON" to see the results. You can enable a download button on the service map by putting

      \`\`\`
      sessionStorage.setItem('apm_debug', 'true')
      \`\`\`

      into the JavaScript console and reloading the page.`,
      },
    }
  );

storiesOf(STORYBOOK_PATH, module)
  .addDecorator((storyFn) => <EuiThemeProvider>{storyFn()}</EuiThemeProvider>)
  .add(
    'Todo app',
    () => {
      return (
        <div>
          <Cytoscape
            elements={exampleResponseTodo.elements}
            height={600}
            width={1340}
          />
        </div>
      );
    },
    {
      info: { propTables: false, source: false },
    }
  );

storiesOf(STORYBOOK_PATH, module)
  .addDecorator((storyFn) => <EuiThemeProvider>{storyFn()}</EuiThemeProvider>)
  .add(
    'Opbeans + beats',
    () => {
      return (
        <div>
          <Cytoscape
            elements={exampleResponseOpbeansBeats.elements}
            height={600}
            width={1340}
          />
        </div>
      );
    },
    {
      info: { propTables: false, source: false },
    }
  );

storiesOf(STORYBOOK_PATH, module)
  .addDecorator((storyFn) => <EuiThemeProvider>{storyFn()}</EuiThemeProvider>)
  .add(
    'Hipster store',
    () => {
      return (
        <div>
          <Cytoscape
            elements={exampleResponseHipsterStore.elements}
            height={600}
            width={1340}
          />
        </div>
      );
    },
    {
      info: { propTables: false, source: false },
    }
  );

storiesOf(STORYBOOK_PATH, module)
  .addDecorator((storyFn) => <EuiThemeProvider>{storyFn()}</EuiThemeProvider>)
  .add(
    'Node resolves one domain name to many IPs',
    () => {
      return (
        <div>
          <Cytoscape
            elements={exampleResponseOneDomainManyIPs.elements}
            height={600}
            width={1340}
          />
        </div>
      );
    },
    {
      info: { propTables: false, source: false },
    }
  );
