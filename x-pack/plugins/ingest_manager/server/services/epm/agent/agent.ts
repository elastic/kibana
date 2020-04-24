/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Handlebars from 'handlebars';
import { safeLoad } from 'js-yaml';
import { DatasourceConfigRecord } from '../../../../common';

function replaceVariablesInYaml(yamlVariables: { [k: string]: any }, yaml: any) {
  const yamlKeys = Object.keys(yamlVariables);
  if (yamlKeys.length === 0) {
    return yaml;
  }

  Object.entries(yaml).forEach(([key, value]: [string, any]) => {
    if (typeof value === 'object') {
      yaml[key] = replaceVariablesInYaml(yamlVariables, value);
    }

    if (typeof value === 'string' && yamlKeys.indexOf(value) >= 0) {
      yaml[key] = yamlVariables[value];
    }
  });

  return yaml;
}

export function createStream(variables: DatasourceConfigRecord, streamTemplate: string) {
  const yamlValues: { [k: string]: any } = {};
  const vars = Object.entries(variables).reduce((acc, [key, recordEntry]) => {
    // support variables with . like key.patterns
    const keyParts = key.split('.');
    const lastKeyPart = keyParts.pop();

    if (!lastKeyPart) {
      throw new Error('Invalid key');
    }

    let varPart = acc;
    for (const keyPart of keyParts) {
      if (!varPart[keyPart]) {
        varPart[keyPart] = {};
      }
      varPart = varPart[keyPart];
    }

    if (recordEntry.type && recordEntry.type === 'yaml') {
      const yamlKeyPlaceholder = `{{${key}}}`;
      varPart[lastKeyPart] = `"${yamlKeyPlaceholder}"`;
      yamlValues[yamlKeyPlaceholder] = recordEntry.value ? safeLoad(recordEntry.value) : null;
    } else {
      varPart[lastKeyPart] = recordEntry.value;
    }
    return acc;
  }, {} as { [k: string]: any });

  const template = Handlebars.compile(streamTemplate, { noEscape: true });
  const stream = template(vars);
  const yamlFromStream = safeLoad(stream, {});

  return replaceVariablesInYaml(yamlValues, yamlFromStream);
}
