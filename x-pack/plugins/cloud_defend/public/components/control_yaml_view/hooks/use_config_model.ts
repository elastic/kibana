/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import yaml from 'js-yaml';
import { setDiagnosticsOptions } from 'monaco-yaml';
import { monaco } from '@kbn/monaco';

/**
 * In order to keep this json in sync with https://github.com/elastic/cloud-defend/blob/main/modules/service/policy-schema.json
 * Do NOT commit edits to policy_schema.json as part of a PR. Please make the changes in the cloud-defend repo and use the
 * make push-policy-schema-kibana command to automate the creation of a PR to sync the changes.
 */
import policySchemaJson from './policy_schema.json';

const { Uri, editor } = monaco;

const SCHEMA_URI = 'http://elastic.co/cloud_defend.yaml';
const modelUri = Uri.parse(SCHEMA_URI);

export const useConfigModel = (configuration: string) => {
  const json = useMemo(() => {
    try {
      return yaml.load(configuration);
    } catch {
      return { selectors: [], responses: [] };
    }
  }, [configuration]);

  // creating a string csv to avoid the next useMemo from re-running regardless of whether
  // selector names changed or not.
  const selectorNamesCSV = useMemo(
    () => json?.selectors?.map((selector: any) => selector.name).join(',') || '',
    [json?.selectors]
  );

  return useMemo(() => {
    const schema: any = { ...policySchemaJson };

    // dynamically setting enum values for response match and exclude properties.
    if (schema.$defs.response.properties.match.items) {
      const responseProps = schema.$defs.response.properties;
      const selectorEnum = { enum: selectorNamesCSV.split(',') };
      responseProps.match.items = selectorEnum;
      responseProps.exclude.items = selectorEnum;
    } else {
      throw new Error('cloud_defend json schema is invalid');
    }

    setDiagnosticsOptions({
      validate: true,
      completion: true,
      hover: true,
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
      model = editor.createModel('', 'yaml', modelUri);
    }

    return model;
  }, [selectorNamesCSV]);
};
