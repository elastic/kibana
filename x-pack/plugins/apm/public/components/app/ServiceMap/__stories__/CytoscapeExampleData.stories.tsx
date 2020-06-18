/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable no-console */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiFieldNumber,
  EuiToolTip,
  EuiCodeEditor,
} from '@elastic/eui';
import { storiesOf } from '@storybook/react';
import React, { useState, useEffect } from 'react';
import { Cytoscape } from '../Cytoscape';
import { generateServiceMapElements } from './generate_service_map_elements';
import exampleResponseOpbeansBeats from './example_response_opbeans_beats.json';
import exampleResponseHipsterStore from './example_response_hipster_store.json';
import exampleResponseTodo from './example_response_todo.json';

const STORYBOOK_PATH = 'app/ServiceMap/Cytoscape/Example data';

const SESSION_STORAGE_KEY = `${STORYBOOK_PATH}/pre-loaded map`;
function getSessionJson() {
  return window.sessionStorage.getItem(SESSION_STORAGE_KEY);
}
function setSessionJson(json: string) {
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, json);
}

storiesOf(STORYBOOK_PATH, module).add(
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

storiesOf(STORYBOOK_PATH, module).add(
  'Map from JSON',
  () => {
    const [json, setJson] = useState<string>(
      getSessionJson() || JSON.stringify(exampleResponseTodo, null, 2)
    );
    const [elements, setElements] = useState<any[]>([]);
    useEffect(() => {
      try {
        setElements(JSON.parse(json).elements);
      } catch (error) {
        console.log(error);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div>
        <Cytoscape elements={elements} height={600} width={1340} />

        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiButton
              onClick={() => {
                setElements(JSON.parse(json).elements);
                setSessionJson(json);
              }}
            >
              Render JSON
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
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
      </div>
    );
  },
  {
    info: { propTables: false, source: false },
  }
);

storiesOf(STORYBOOK_PATH, module).add(
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

storiesOf(STORYBOOK_PATH, module).add(
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

storiesOf(STORYBOOK_PATH, module).add(
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
