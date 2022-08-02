/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';

export function createFilebeatConfig(
  index: string,
  results: FindFileStructureResponse,
  ingestPipelineId: string,
  username: string | null
) {
  return [
    'filebeat.inputs:',
    '- type: log',
    ...getPaths(),
    ...getEncoding(results),
    ...getExcludeLines(results),
    ...getMultiline(results),
    '',
    ...getProcessors(results),
    'output.elasticsearch:',
    '  hosts: ["<es_url>"]',
    ...getUserDetails(username),
    `  index: "${index}"`,
    `  pipeline: "${ingestPipelineId}"`,
    '',
    'setup:',
    '  template.enabled: false',
    '  ilm.enabled: false',
  ].join('\n');
}

function getPaths() {
  const txt = i18n.translate('xpack.dataVisualizer.fileBeatConfig.paths', {
    defaultMessage: 'add path to your files here',
  });
  return ['  paths:', `  - '<${txt}>'`];
}

function getEncoding(results: any) {
  return results.charset !== 'UTF-8' ? [`  encoding: ${results.charset}`] : [];
}

function getExcludeLines(results: any) {
  return results.exclude_lines_pattern !== undefined
    ? [`  exclude_lines: ['${results.exclude_lines_pattern.replace(/'/g, "''")}']`]
    : [];
}

function getMultiline(results: any) {
  return results.multiline_start_pattern !== undefined
    ? [
        '  multiline:',
        `    pattern: '${results.multiline_start_pattern.replace(/'/g, "''")}'`,
        '    match: after',
        '    negate: true',
      ]
    : [];
}

function getProcessors(results: any) {
  return results.need_client_timezone === true ? ['processors:', '- add_locale: ~', ''] : [];
}

function getUserDetails(username: string | null) {
  return username !== null ? [`  username: "${username}"`, '  password: "<password>"'] : [];
}
