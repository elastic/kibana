/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Handlebars from 'handlebars';
import { safeLoad, safeDump } from 'js-yaml';

import type { PackagePolicyConfigRecord } from '../../../../common';

const handlebars = Handlebars.create();

export function compileTemplate(variables: PackagePolicyConfigRecord, templateStr: string) {
  const { vars, yamlValues } = buildTemplateVariables(variables, templateStr);
  const template = handlebars.compile(templateStr, { noEscape: true });
  let compiledTemplate = template(vars);
  compiledTemplate = replaceRootLevelYamlVariables(yamlValues, compiledTemplate);

  const yamlFromCompiledTemplate = safeLoad(compiledTemplate, {});

  // Hack to keep empty string ('') values around in the end yaml because
  // `safeLoad` replaces empty strings with null
  const patchedYamlFromCompiledTemplate = Object.entries(yamlFromCompiledTemplate).reduce(
    (acc, [key, value]) => {
      if (value === null && typeof vars[key] === 'string' && vars[key].trim() === '') {
        acc[key] = '';
      } else {
        acc[key] = value;
      }
      return acc;
    },
    {} as { [k: string]: any }
  );

  return replaceVariablesInYaml(yamlValues, patchedYamlFromCompiledTemplate);
}

function isValidKey(key: string) {
  return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
}

function replaceVariablesInYaml(yamlVariables: { [k: string]: any }, yaml: any) {
  if (Object.keys(yamlVariables).length === 0 || !yaml) {
    return yaml;
  }

  Object.entries(yaml).forEach(([key, value]: [string, any]) => {
    if (typeof value === 'object') {
      yaml[key] = replaceVariablesInYaml(yamlVariables, value);
    }
    if (typeof value === 'string' && value in yamlVariables) {
      yaml[key] = yamlVariables[value];
    }
  });

  return yaml;
}

const maybeEscapeString = (value: string) => {
  // Numeric strings need to be quoted to stay strings.
  if (value.length && !isNaN(+value)) {
    return `"${value}"`;
  }
  return value;
};

function buildTemplateVariables(variables: PackagePolicyConfigRecord, templateStr: string) {
  const yamlValues: { [k: string]: any } = {};
  const vars = Object.entries(variables).reduce((acc, [key, recordEntry]) => {
    // support variables with . like key.patterns
    const keyParts = key.split('.');
    const lastKeyPart = keyParts.pop();

    if (!lastKeyPart || !isValidKey(lastKeyPart)) {
      throw new Error('Invalid key');
    }

    let varPart = acc;
    for (const keyPart of keyParts) {
      if (!isValidKey(keyPart)) {
        throw new Error('Invalid key');
      }
      if (!varPart[keyPart]) {
        varPart[keyPart] = {};
      }
      varPart = varPart[keyPart];
    }

    if (recordEntry.type && recordEntry.type === 'yaml') {
      const yamlKeyPlaceholder = `##${key}##`;
      varPart[lastKeyPart] = recordEntry.value ? `"${yamlKeyPlaceholder}"` : null;
      yamlValues[yamlKeyPlaceholder] = recordEntry.value ? safeLoad(recordEntry.value) : null;
    } else if (
      recordEntry.type &&
      (recordEntry.type === 'text' || recordEntry.type === 'string') &&
      recordEntry.value?.length
    ) {
      if (Array.isArray(recordEntry.value)) {
        varPart[lastKeyPart] = recordEntry.value.map((value: string) => maybeEscapeString(value));
      } else {
        varPart[lastKeyPart] = maybeEscapeString(recordEntry.value);
      }
    } else {
      varPart[lastKeyPart] = recordEntry.value;
    }
    return acc;
  }, {} as { [k: string]: any });

  return { vars, yamlValues };
}

function containsHelper(this: any, item: string, check: string | string[], options: any) {
  if ((Array.isArray(check) || typeof check === 'string') && check.includes(item)) {
    if (options && options.fn) {
      return options.fn(this);
    }
    return true;
  }
  return '';
}
handlebars.registerHelper('contains', containsHelper);

function replaceRootLevelYamlVariables(yamlVariables: { [k: string]: any }, yamlTemplate: string) {
  if (Object.keys(yamlVariables).length === 0 || !yamlTemplate) {
    return yamlTemplate;
  }

  let patchedTemplate = yamlTemplate;
  Object.entries(yamlVariables).forEach(([key, val]) => {
    patchedTemplate = patchedTemplate.replace(
      new RegExp(`^"${key}"`, 'gm'),
      val ? safeDump(val) : ''
    );
  });

  return patchedTemplate;
}
