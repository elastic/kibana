/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import path from 'path';

import type { RegistryDataStream } from '../../../../types';

import { rewriteIngestPipeline, getPipelineNameForInstallation } from './install';

test('a json-format pipeline with pipeline references is correctly rewritten', () => {
  const inputStandard = readFileSync(
    path.join(__dirname, '/tests/ingest_pipelines/real_input_standard.json'),
    'utf-8'
  );
  const inputBeats = readFileSync(
    path.join(__dirname, '/tests/ingest_pipelines/real_input_beats.json'),
    'utf-8'
  );
  const output = readFileSync(
    path.join(__dirname, '/tests/ingest_pipelines/real_output.json')
  ).toString('utf-8');

  const substitutions = [
    {
      source: 'pipeline-json',
      target: 'new-pipeline-json',
      templateFunction: 'IngestPipeline',
    },
    {
      source: 'pipeline-plaintext',
      target: 'new-pipeline-plaintext',
      templateFunction: 'IngestPipeline',
    },
  ];
  expect(rewriteIngestPipeline(inputStandard, substitutions)).toBe(output);
  expect(rewriteIngestPipeline(inputBeats, substitutions)).toBe(output);
});

test('a yml-format pipeline with pipeline references is correctly rewritten', () => {
  const inputStandard = readFileSync(
    path.join(__dirname, '/tests/ingest_pipelines/real_input_standard.yml')
  ).toString('utf-8');
  const inputBeats = readFileSync(
    path.join(__dirname, '/tests/ingest_pipelines/real_input_beats.yml')
  ).toString('utf-8');
  const output = readFileSync(
    path.join(__dirname, '/tests/ingest_pipelines/real_output.yml')
  ).toString('utf-8');

  const substitutions = [
    {
      source: 'pipeline-json',
      target: 'new-pipeline-json',
      templateFunction: 'IngestPipeline',
    },
    {
      source: 'pipeline-plaintext',
      target: 'new-pipeline-plaintext',
      templateFunction: 'IngestPipeline',
    },
  ];
  expect(rewriteIngestPipeline(inputStandard, substitutions)).toBe(output);
  expect(rewriteIngestPipeline(inputBeats, substitutions)).toBe(output);
});

test('a json-format pipeline with no pipeline references stays unchanged', () => {
  const input = readFileSync(
    path.join(__dirname, '/tests/ingest_pipelines/no_replacement.json')
  ).toString('utf-8');

  const substitutions = [
    {
      source: 'pipeline-json',
      target: 'new-pipeline-json',
      templateFunction: 'IngestPipeline',
    },
    {
      source: 'pipeline-plaintext',
      target: 'new-pipeline-plaintext',
      templateFunction: 'IngestPipeline',
    },
  ];
  expect(rewriteIngestPipeline(input, substitutions)).toBe(input);
});

test('a yml-format pipeline with no pipeline references stays unchanged', () => {
  const input = readFileSync(
    path.join(__dirname, '/tests/ingest_pipelines/no_replacement.yml')
  ).toString('utf-8');

  const substitutions = [
    {
      source: 'pipeline-json',
      target: 'new-pipeline-json',
      templateFunction: 'IngestPipeline',
    },
    {
      source: 'pipeline-plaintext',
      target: 'new-pipeline-plaintext',
      templateFunction: 'IngestPipeline',
    },
  ];
  expect(rewriteIngestPipeline(input, substitutions)).toBe(input);
});

test('getPipelineNameForInstallation gets correct name', () => {
  const dataStream: RegistryDataStream = {
    dataset: 'coredns.log',
    title: 'CoreDNS logs',
    release: 'ga',
    type: 'logs',
    ingest_pipeline: 'pipeline-entry',
    package: 'coredns',
    path: 'log',
  };
  const packageVersion = '1.0.1';
  const pipelineRefName = 'pipeline-json';
  const pipelineEntryNameForInstallation = getPipelineNameForInstallation({
    pipelineName: dataStream.ingest_pipeline!,
    dataStream,
    packageVersion,
  });
  const pipelineRefNameForInstallation = getPipelineNameForInstallation({
    pipelineName: pipelineRefName,
    dataStream,
    packageVersion,
  });
  expect(pipelineEntryNameForInstallation).toBe(
    `${dataStream.type}-${dataStream.dataset}-${packageVersion}`
  );
  expect(pipelineRefNameForInstallation).toBe(
    `${dataStream.type}-${dataStream.dataset}-${packageVersion}-${pipelineRefName}`
  );
});
