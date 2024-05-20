/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { sampleSize } from 'lodash';

const generateMapping = (fieldsCount: number, numberOfMappedFieldsPerIndex: number) => {
  const properties: { [key: string]: {} } = {
    '@timestamp': {
      type: 'date',
    },
  };
  const ids = [...Array(fieldsCount - 1).keys()];
  const sampledIds = sampleSize(ids, numberOfMappedFieldsPerIndex);
  for (const i of sampledIds) {
    properties[`fake_field_${i}`] = {
      type: 'keyword',
      ignore_above: 1024,
    };
  }
  const mappings = { properties };
  return mappings;
};

const generateIndex = (
  indexId: number,
  bucketId: number,
  indexPrefix: string,
  fieldsCount: number,
  numberOfMappedFieldsPerIndex: number
) => {
  const indexTemplate = {
    type: 'index',
    value: {
      index: 'template',
      mappings: {},
      settings: {
        index: {
          number_of_replicas: '0',
          number_of_shards: '1',
        },
        mapping: {
          total_fields: { limit: fieldsCount },
        },
      },
    },
  };
  indexTemplate.value.index = `${indexPrefix}-${bucketId}-index-${`000000${indexId}`.slice(-6)}`;
  const mappings = generateMapping(fieldsCount, numberOfMappedFieldsPerIndex);
  indexTemplate.value.mappings = mappings;
  return indexTemplate;
};

const generateIndices = (
  outputDirectory: string,
  indexCount: number,
  indexPrefix: string,
  fieldsCount: number,
  numberOfMappedFieldsPerIndex: number,
  numberOfIndexBuckets: number,
  purgeOutputDirectory: boolean
) => {
  const absoluteOutputDir = path.resolve(outputDirectory);

  if (purgeOutputDirectory) {
    // Delete output directory if exists
    console.log(`Deleting directory: ${absoluteOutputDir}`);
    if (fs.existsSync(absoluteOutputDir)) {
      fs.rmSync(absoluteOutputDir, { recursive: true, force: true });
    }
  }

  // Create output directory if needed
  console.log(`Creating directory: ${absoluteOutputDir}`);
  fs.mkdirSync(absoluteOutputDir, { recursive: true });

  let indicesLeft = indexCount;
  const indicesPerBucket = Math.ceil(indexCount / numberOfIndexBuckets);

  const bucketIds = [...Array(numberOfIndexBuckets).keys()];
  for (const bucketId of bucketIds) {
    const bucketDir = `${absoluteOutputDir}/bucket${bucketId}`;
    fs.mkdirSync(bucketDir, { recursive: true });

    const indexFilename = `${bucketDir}/index.mappings.json`;
    console.log(`Generating index: ${indexFilename}`);
    const stream = fs.createWriteStream(indexFilename, { flags: 'a' });
    const ids = [...Array(Math.min(indicesPerBucket, indicesLeft)).keys()];
    for (const indexId of ids) {
      const index = generateIndex(
        indexId,
        bucketId,
        indexPrefix,
        fieldsCount,
        numberOfMappedFieldsPerIndex
      );
      stream.write(`${JSON.stringify(index)}\n\n`);
    }
    stream.end();
    indicesLeft -= indicesPerBucket;
  }
};

const main = () => {
  const { argv } = yargs(process.argv.slice(2))
    .option('fieldsCount', {
      demandOption: true,
      type: 'number',
      description: 'Number of the fields in each index',
    })
    .option('indexCount', {
      demandOption: true,
      type: 'number',
      description: 'Number of indices to generate',
    })
    .option('indexPrefix', {
      demandOption: true,
      type: 'string',
      description: 'Prefix of the index name',
    })
    .option('unmappedRate', {
      demandOption: true,
      type: 'number',
      description: 'Probablity of field to be unmapped in the index',
    })
    .option('buckets', {
      demandOption: false,
      type: 'number',
      default: 1,
      description: 'Number of buckets with indices (default is 1)',
    })
    .option('outputDirectory', {
      demandOption: true,
      type: 'string',
      description: 'The name of the directory to save generated mappings to',
    })
    .option('purgeOutputDirectory', {
      alias: 'p',
      demandOption: false,
      type: 'boolean',
      default: false,
      description:
        'Indicates whether we should purge existing output directory before running main script (default is false)',
    })

    .check(({ unmappedRate }) => {
      if (unmappedRate < 0.0 || unmappedRate > 1.0) {
        throw new Error('--unmappedRate can only be in range [0.0, 1.0]');
      } else {
        return true;
      }
    })
    .help();

  const {
    fieldsCount,
    indexCount,
    indexPrefix,
    unmappedRate,
    buckets,
    outputDirectory,
    purgeOutputDirectory,
  } = argv;
  const numberOfMappedFieldsPerIndex = Math.max(Math.floor(fieldsCount * (1.0 - unmappedRate)), 1);
  const numberOfIndexBuckets = Math.max(1, Math.min(buckets, indexCount));

  generateIndices(
    outputDirectory,
    indexCount,
    indexPrefix,
    fieldsCount,
    numberOfMappedFieldsPerIndex,
    numberOfIndexBuckets,
    purgeOutputDirectory
  );
};

main();
