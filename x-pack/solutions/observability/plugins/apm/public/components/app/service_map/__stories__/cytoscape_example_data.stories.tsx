/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiFieldNumber,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiToolTip,
} from '@elastic/eui';
import type { StoryFn, Meta, StoryObj } from '@storybook/react';
import React, { useEffect, useState, useCallback } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { useArgs } from '@storybook/preview-api';
import {
  getPaths,
  getServiceMapNodes,
  type ServiceMapResponse,
} from '../../../../../common/service_map';
import { Cytoscape } from '../cytoscape';
import { Centerer } from './centerer';
import exampleResponseHipsterStore from './example_response_hipster_store.json';
import exampleResponseOpbeansBeats from './example_response_opbeans_beats.json';
import exampleResponseTodo from './example_response_todo.json';
import { generateServiceMapElements } from './generate_service_map_elements';
import { MockApmPluginStorybook } from '../../../../context/apm_plugin/mock_apm_plugin_storybook';

function getHeight() {
  return window.innerHeight - 200;
}

const stories: Meta<{}> = {
  title: 'app/ServiceMap/Example data',
  component: Cytoscape,
  decorators: [(wrappedStory) => <MockApmPluginStorybook>{wrappedStory()}</MockApmPluginStorybook>],
};

export default stories;

export const GenerateMap: StoryFn<{}> = () => {
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
            data-test-subj="apmGenerateMapGenerateServiceMapButton"
            onClick={() => {
              setElements(generateServiceMapElements({ size, hasAnomalies: true }));
              setJson('');
            }}
          >
            Generate service map
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiToolTip position="right" content="Number of services">
            <EuiFieldNumber
              data-test-subj="apmGenerateMapFieldNumber"
              placeholder="Size"
              value={size}
              onChange={(e) => setSize(e.target.valueAsNumber)}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton
            data-test-subj="apmGenerateMapGetJsonButton"
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
        <CodeEditor // TODO Unable to find context that provides theme. Need CODEOWNER Input
          languageId="json"
          value={json}
          height="200px"
          options={{ fontFamily: 'monospace' }}
        />
      )}
    </div>
  );
};

const assertJSON: (json?: any) => asserts json is ServiceMapResponse = (json) => {
  if (!!json && !('elements' in json || 'spans' in json)) {
    throw new Error('invalid json');
  }
};

const MapFromJSONTemplate = () => {
  const [{ json }, updateArgs] = useArgs();

  const [error, setError] = useState<string | undefined>();
  const [elements, setElements] = useState<any[]>([]);

  const [uniqueKeyCounter, setUniqueKeyCounter] = useState<number>(0);
  const updateRenderedElements = useCallback(() => {
    try {
      assertJSON(json);
      if ('elements' in json) {
        setElements(json.elements ?? []);
      } else {
        const paths = getPaths({ spans: json.spans ?? [] });
        const nodes = getServiceMapNodes({
          anomalies: json.anomalies ?? {
            mlJobIds: [],
            serviceAnomalies: [],
          },
          connections: paths.connections,
          servicesData: json.servicesData ?? [],
          exitSpanDestinations: paths.exitSpanDestinations,
        });

        setElements(nodes.elements);
      }
      setUniqueKeyCounter((key) => key + 1);
      setError(undefined);
    } catch (e) {
      setError(e.message);
    }
  }, [json]);

  useEffect(() => {
    updateRenderedElements();
  }, [updateRenderedElements]);

  return (
    <EuiFlexGroup
      direction="column"
      justifyContent="spaceBetween"
      style={{ minHeight: '100vh' }}
      gutterSize="xs"
    >
      <EuiFlexItem grow={false}>
        <EuiCallOut
          size="s"
          title="Upload a JSON file or paste a JSON object in the Storybook Controls panel."
          iconType="pin"
        />
      </EuiFlexItem>
      <EuiFlexItem grow>
        <Cytoscape key={uniqueKeyCounter} elements={elements} height={getHeight()}>
          <Centerer />
        </Cytoscape>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiForm isInvalid={error !== undefined} error={error}>
          <EuiFilePicker
            display="large"
            fullWidth
            initialPromptText="Upload a JSON file"
            onChange={(event) => {
              const item = event?.item(0);

              if (item) {
                const f = new FileReader();
                f.onload = (onloadEvent) => {
                  const result = onloadEvent?.target?.result;
                  if (typeof result === 'string') {
                    updateArgs({ json: JSON.parse(result) });
                  }
                };
                f.readAsText(item);
              }
            }}
          />
        </EuiForm>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const MapFromJSON: StoryObj<typeof MapFromJSONTemplate> = {
  render: MapFromJSONTemplate,
  argTypes: {
    json: {
      defaultValue: exampleResponseTodo,
      control: 'object',
    },
  },
};

export const TodoApp: StoryFn<{}> = () => {
  return (
    <div>
      <Cytoscape elements={exampleResponseTodo.elements} height={window.innerHeight}>
        <Centerer />
      </Cytoscape>
    </div>
  );
};

export const OpbeansAndBeats: StoryFn<{}> = () => {
  return (
    <div>
      <Cytoscape elements={exampleResponseOpbeansBeats.elements} height={window.innerHeight}>
        <Centerer />
      </Cytoscape>
    </div>
  );
};

export const HipsterStore: StoryFn<{}> = () => {
  return (
    <div>
      <Cytoscape elements={exampleResponseHipsterStore.elements} height={window.innerHeight}>
        <Centerer />
      </Cytoscape>
    </div>
  );
};
