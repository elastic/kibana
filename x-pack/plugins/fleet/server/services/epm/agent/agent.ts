/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Handlebars from 'handlebars';
import { safeLoad, safeDump } from 'js-yaml';
import type { Logger } from '@kbn/core/server';

import type { PackagePolicyConfigRecord } from '../../../../common/types';
import { toCompiledSecretRef } from '../../secrets';
import { PackageInvalidArchiveError } from '../../../errors';
import { appContextService } from '../..';

const handlebars = Handlebars.create();

export function compileTemplate(variables: PackagePolicyConfigRecord, templateStr: string) {
  const logger = appContextService.getLogger();
  const { vars, yamlValues } = buildTemplateVariables(logger, variables);
  let compiledTemplate: string;
  try {
    const template = handlebars.compile(templateStr, { noEscape: true });
    compiledTemplate = template(vars);
  } catch (err) {
    throw new PackageInvalidArchiveError(`Error while compiling agent template: ${err.message}`);
  }

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

function buildTemplateVariables(logger: Logger, variables: PackagePolicyConfigRecord) {
  const yamlValues: { [k: string]: any } = {};
  const vars = Object.entries(variables).reduce((acc, [key, recordEntry]) => {
    // support variables with . like key.patterns
    const keyParts = key.split('.');
    const lastKeyPart = keyParts.pop();
    logger.debug(`Building agent template variables`);

    if (!lastKeyPart || !isValidKey(lastKeyPart)) {
      throw new PackageInvalidArchiveError(
        `Error while compiling agent template: Invalid key ${lastKeyPart}`
      );
    }

    let varPart = acc;
    for (const keyPart of keyParts) {
      if (!isValidKey(keyPart)) {
        throw new PackageInvalidArchiveError(
          `Error while compiling agent template: Invalid key ${keyPart}`
        );
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
    } else if (recordEntry.value && recordEntry.value.isSecretRef) {
      varPart[lastKeyPart] = toCompiledSecretRef(recordEntry.value.id);
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

// escapeStringHelper will wrap the provided string with single quotes.
// Single quoted strings in yaml need to escape single quotes by doubling them
// and to respect any incoming newline we also need to double them, otherwise
// they will be replaced with a space.
function escapeStringHelper(str: string) {
  return "'" + str.replace(/\'/g, "''").replace(/\n/g, '\n\n') + "'";
}
handlebars.registerHelper('escape_string', escapeStringHelper);

// toJsonHelper will convert any object to a Json string.
function toJsonHelper(value: any) {
  if (typeof value === 'string') {
    // if we get a string we assume is an already serialized json
    return value;
  }
  return JSON.stringify(value);
}
handlebars.registerHelper('to_json', toJsonHelper);

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
