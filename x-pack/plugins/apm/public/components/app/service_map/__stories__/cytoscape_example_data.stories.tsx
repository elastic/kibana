/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFieldNumber,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { Meta, Story } from '@storybook/react';
import React, { useEffect, useState } from 'react';
import { CoreStart } from '@kbn/core/public';
import {
  CodeEditor,
  createKibanaReactContext,
} from '@kbn/kibana-react-plugin/public';
import { Cytoscape } from '../cytoscape';
import { Centerer } from './centerer';
import exampleResponseHipsterStore from './example_response_hipster_store.json';
import exampleResponseOpbeansBeats from './example_response_opbeans_beats.json';
import exampleResponseTodo from './example_response_todo.json';
import { generateServiceMapElements } from './generate_service_map_elements';

const STORYBOOK_PATH = 'app/ServiceMap/Example data';

const SESSION_STORAGE_KEY = `${STORYBOOK_PATH}/pre-loaded map`;
function getSessionJson() {
  return window.sessionStorage.getItem(SESSION_STORAGE_KEY);
}
function setSessionJson(json: string) {
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, json);
}

function getHeight() {
  return window.innerHeight - 300;
}

const stories: Meta<{}> = {
  title: 'app/ServiceMap/Example data',
  component: Cytoscape,
  decorators: [
    (StoryComponent, { globals }) => {
      const KibanaReactContext = createKibanaReactContext({
        uiSettings: {
          get: () => globals.euiTheme && globals.euiTheme.includes('dark'),
        },
      } as unknown as Partial<CoreStart>);

      return (
        <KibanaReactContext.Provider>
          <StoryComponent />
        </KibanaReactContext.Provider>
      );
    },
  ],
};

export default stories;

export const GenerateMap: Story<{}> = () => {
  const [size, setSize] = useState<number>(10);
  const [json, setJson] = useState<string>('');
  const [elements, setElements] = useState<any[]>(
    generateServiceMapElements({ size, hasAnomalies: true })
  );
  return (
    <div>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiButton
            onClick={() => {
              setElements(
                generateServiceMapElements({ size, hasAnomalies: true })
              );
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

      <Cytoscape elements={elements} height={getHeight()}>
        <Centerer />
      </Cytoscape>

      {json && (
        <CodeEditor
          languageId="json"
          value={json}
          height="200px"
          options={{ fontFamily: 'monospace' }}
        />
      )}
    </div>
  );
};

export const MapFromJSON: Story<{}> = () => {
  const [json, setJson] = useState<string>(
    getSessionJson() || JSON.stringify(exampleResponseTodo, null, 2)
  );
  const [error, setError] = useState<string | undefined>();

  const [elements, setElements] = useState<any[]>([]);

  const [uniqueKeyCounter, setUniqueKeyCounter] = useState<number>(0);
  const updateRenderedElements = () => {
    try {
      setElements(JSON.parse(json).elements);
      setUniqueKeyCounter((key) => key + 1);
      setError(undefined);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    updateRenderedElements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Cytoscape
        key={uniqueKeyCounter}
        elements={elements}
        height={getHeight()}
      >
        <Centerer />
      </Cytoscape>
      <EuiForm isInvalid={error !== undefined} error={error}>
        <EuiFlexGroup>
          <EuiFlexItem>
            <CodeEditor
              languageId="json"
              value={json}
              options={{ fontFamily: 'monospace' }}
              onChange={(value) => {
                setJson(value);
                setSessionJson(value);
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
                  updateRenderedElements();
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
};

export const TodoApp: Story<{}> = () => {
  return (
    <div>
      <Cytoscape
        elements={exampleResponseTodo.elements}
        height={window.innerHeight}
      >
        <Centerer />
      </Cytoscape>
    </div>
  );
};

export const OpbeansAndBeats: Story<{}> = () => {
  return (
    <div>
      <Cytoscape
        elements={exampleResponseOpbeansBeats.elements}
        height={window.innerHeight}
      >
        <Centerer />
      </Cytoscape>
    </div>
  );
};

export const HipsterStore: Story<{}> = () => {
  return (
    <div>
      <Cytoscape
        elements={exampleResponseHipsterStore.elements}
        height={window.innerHeight}
      >
        <Centerer />
      </Cytoscape>
    </div>
  );
};
