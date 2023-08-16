/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import { setDiagnosticsOptions } from 'monaco-yaml';
import { monaco } from '@kbn/monaco';
import { getSelectorsAndResponsesFromYaml } from '../../../../common/utils/helpers';

/**
 * In order to keep this json in sync with https://github.com/elastic/cloud-defend/blob/main/modules/service/policy-schema.json
 * Do NOT commit edits to policy_schema.json as part of a PR. Please make the changes in the cloud-defend repo.
 * Buildkite will take care of creating a PR in kibana.
 */
import policySchemaJson from './policy_schema.json';

const { Uri, editor } = monaco;

const SCHEMA_URI = 'http://elastic.co/cloud_defend.json';
const modelUri = Uri.parse(SCHEMA_URI);

export const useConfigModel = (configuration: string) => {
  return useMemo(() => {
    const { selectors } = getSelectorsAndResponsesFromYaml(configuration);
    const schema: any = { ...policySchemaJson };

    // dynamically setting enum values for response match and exclude properties.
    if (schema.$defs.fileResponse.properties.match.items) {
      const responseProps = schema.$defs.fileResponse.properties;
      const selectorEnum = {
        enum: selectors
          .filter((selector) => selector.type === 'file')
          .map((selector) => selector.name),
      };
      responseProps.match.items = selectorEnum;
      responseProps.exclude.items = selectorEnum;
    }

    if (schema.$defs.processResponse.properties.match.items) {
      const responseProps = schema.$defs.processResponse.properties;
      const selectorEnum = {
        enum: selectors
          .filter((selector) => selector.type === 'process')
          .map((selector) => selector.name),
      };
      responseProps.match.items = selectorEnum;
      responseProps.exclude.items = selectorEnum;
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
  }, [configuration]);
};
