/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { monaco } from '@kbn/monaco';
import { useObservabilityAIAssistant } from './use_observability_ai_assistant';

const { editor, languages, Uri } = monaco;

const SCHEMA_URI = 'http://elastic.co/foo.json';
const modelUri = Uri.parse(SCHEMA_URI);

export const useJsonEditorModel = ({
  functionName,
  initialJson,
}: {
  functionName: string | undefined;
  initialJson?: string | undefined;
}) => {
  const { getFunctions } = useObservabilityAIAssistant();
  const functions = getFunctions();

  const functionDefinition = functions.find((func) => func.options.name === functionName);

  return useMemo(() => {
    if (!functionDefinition) {
      return {};
    }

    const schema = { ...functionDefinition.options.parameters };

    const initialJsonString = initialJson
      ? initialJson
      : functionDefinition.options.parameters.properties
      ? Object.keys(functionDefinition.options.parameters.properties).reduce(
          (acc, curr, index, arr) => {
            const val = `${acc}  "${curr}": "",\n`;
            return index === arr.length - 1 ? `${val}}` : val;
          },
          '{\n'
        )
      : '';

    languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [
        {
          uri: SCHEMA_URI,
          fileMatch: [String(modelUri)],
          schema,
        },
      ],
    });

    let model = editor.getModel(modelUri);

    if (model === null) {
      model = editor.createModel(initialJsonString, 'json', modelUri);
    }

    return { model, initialJsonString };
  }, [functionDefinition, initialJson]);
};
