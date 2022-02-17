/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

require('../../../../../src/setup_node_env');

// eslint-disable-next-line import/no-extraneous-dependencies
const extract = require('extract-zip');
const fs = require('fs');
// eslint-disable-next-line import/no-extraneous-dependencies
const yaml = require('js-yaml');
const https = require('https');
// eslint-disable-next-line import/no-extraneous-dependencies
const { get, isArray, isEmpty, isNumber, isString, pick } = require('lodash');
// eslint-disable-next-line import/no-extraneous-dependencies
const Q = require('q');
// eslint-disable-next-line import/no-extraneous-dependencies
const rimraf = require('rimraf');
const { resolve } = require('path');
// eslint-disable-next-line import/no-extraneous-dependencies
const tar = require('tar');
const zlib = require('zlib');

const OUTPUT_DIRECTORY = resolve('scripts', 'beat_docs');
const OUTPUT_SERVER_DIRECTORY = resolve('../timelines', 'server', 'utils', 'beat_schema');
const BEATS_VERSION = '8.0.0-rc1';

const beats = [
  {
    filePath: `${OUTPUT_DIRECTORY}/auditbeat-${BEATS_VERSION}-darwin-x86_64.tar.gz`,
    index: 'auditbeat-*',
    outputDir: `${OUTPUT_DIRECTORY}/auditbeat-${BEATS_VERSION}-darwin-x86_64`,
    url: `https://artifacts.elastic.co/downloads/beats/auditbeat/auditbeat-${BEATS_VERSION}-darwin-x86_64.tar.gz`,
  },
  {
    filePath: `${OUTPUT_DIRECTORY}/filebeat-${BEATS_VERSION}-darwin-x86_64.tar.gz`,
    index: 'filebeat-*',
    outputDir: `${OUTPUT_DIRECTORY}/filebeat-${BEATS_VERSION}-darwin-x86_64`,
    url: `https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-${BEATS_VERSION}-darwin-x86_64.tar.gz`,
  },
  {
    filePath: `${OUTPUT_DIRECTORY}/packetbeat-${BEATS_VERSION}-darwin-x86_64.tar.gz`,
    index: 'packetbeat-*',
    outputDir: `${OUTPUT_DIRECTORY}/packetbeat-${BEATS_VERSION}-darwin-x86_64`,
    url: `https://artifacts.elastic.co/downloads/beats/packetbeat/packetbeat-${BEATS_VERSION}-darwin-x86_64.tar.gz`,
  },
  {
    filePath: `${OUTPUT_DIRECTORY}/winlogbeat-${BEATS_VERSION}-windows-x86_64.zip`,
    index: 'winlogbeat-*',
    outputDir: `${OUTPUT_DIRECTORY}`,
    url: `https://artifacts.elastic.co/downloads/beats/winlogbeat/winlogbeat-${BEATS_VERSION}-windows-x86_64.zip`,
  },
];

const download = async (url, filepath) => {
  const fileStream = fs.createWriteStream(filepath);
  const deferred = Q.defer();

  fileStream
    .on('open', function () {
      https.get(url, function (res) {
        res.on('error', function (err) {
          deferred.reject(err);
        });

        res.pipe(fileStream);
      });
    })
    .on('error', function (err) {
      deferred.reject(err);
    })
    .on('finish', function () {
      deferred.resolve(filepath);
    });

  return deferred.promise;
};

const paramsToPick = ['category', 'description', 'example', 'name', 'type', 'format'];

const onlyStringOrNumber = (fields) =>
  Object.keys(fields).reduce((acc, item) => {
    let value = get(fields, item);
    if (item === 'description' && isString(value)) {
      value = value.replace(/\n/g, ' ');
    }
    return {
      ...acc,
      [item]: isString(value) || isNumber(value) ? value : JSON.stringify(value),
    };
  }, {});

const convertFieldsToHash = (schemaFields, beatFields, path) =>
  schemaFields.fields && isArray(schemaFields.fields)
    ? schemaFields.fields.reduce((accumulator, item) => {
        if (item.name) {
          const attr = isEmpty(path) ? item.name : `${path}.${item.name}`;
          const splitAttr = attr.split('.');
          const category = splitAttr.length === 1 ? 'base' : splitAttr[0];
          const myItem = {
            ...item,
            category,
            name: attr,
          };
          if (!isEmpty(item.fields)) {
            return {
              ...accumulator,
              ...convertFieldsToHash(myItem, beatFields, attr),
            };
          } else if (beatFields[attr] === undefined) {
            return {
              ...accumulator,
              [attr]: onlyStringOrNumber(pick(myItem, paramsToPick)),
            };
          }
        }
        return accumulator;
      }, {})
    : {};

const convertSchemaToHash = (schema, beatFields) => {
  return schema.reduce((accumulator, item) => {
    if (item.fields != null && !isEmpty(item.fields)) {
      return {
        ...accumulator,
        ...convertFieldsToHash(item, accumulator),
      };
    }
    return accumulator;
  }, beatFields);
};

const manageZipFields = async (beat, filePath, beatFields) => {
  try {
    await extract(filePath, { dir: beat.outputDir });
    console.log('building fields', beat.index);
    const obj = yaml.load(
      fs.readFileSync(`${beat.outputDir}/winlogbeat-${BEATS_VERSION}-windows-x86_64/fields.yml`, {
        encoding: 'utf-8',
      })
    );
    const eBeatFields = convertSchemaToHash(obj, beatFields);
    console.log('deleting files', beat.index);
    rimraf.sync(`${beat.outputDir}/winlogbeat-${BEATS_VERSION}-windows-x86_64`);
    rimraf.sync(beat.filePath);

    return eBeatFields;
  } catch (err) {
    throw new Error(err);
  }
};

const manageTarFields = async (beat, filePath, beatFields) =>
  new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(zlib.createGunzip())
      .pipe(
        tar.extract({
          sync: true,
          cwd: OUTPUT_DIRECTORY,
          filter: function (path) {
            return path.includes('fields.yml');
          },
        })
      )
      .on('end', function (err) {
        if (err) {
          return reject(new Error(err));
        }
        console.log('building fields', beat.index);
        const obj = yaml.load(
          fs.readFileSync(`${beat.outputDir}/fields.yml`, { encoding: 'utf-8' })
        );
        const ebeatFields = convertSchemaToHash(obj, beatFields);
        console.log('deleting files', beat.index);
        rimraf.sync(beat.outputDir);
        rimraf.sync(beat.filePath);
        resolve(ebeatFields);
      });
  });

async function main() {
  let beatFields = {
    _id: {
      category: 'base',
      description: 'Each document has an _id that uniquely identifies it',
      example: 'Y-6TfmcB0WOhS6qyMv3s',
      name: '_id',
      type: 'keyword',
    },
    _index: {
      category: 'base',
      description:
        'An index is like a ‘database’ in a relational database. It has a mapping which defines multiple types. An index is a logical namespace which maps to one or more primary shards and can have zero or more replica shards.',
      example: 'auditbeat-8.0.0-2019.02.19-000001',
      name: '_index',
      type: 'keyword',
    },
  };

  for (const myBeat of beats) {
    console.log('downloading', myBeat.index);
    const filepath = await download(myBeat.url, myBeat.filePath);
    if (myBeat.index === 'winlogbeat-*') {
      beatFields = await manageZipFields(myBeat, filepath, beatFields);
    } else {
      beatFields = await manageTarFields(myBeat, filepath, beatFields);
    }
    console.log('done for', myBeat.index);
  }
  const body = `/*
      * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
      * or more contributor license agreements. Licensed under the Elastic License
      * 2.0; you may not use this file except in compliance with the Elastic License
      * 2.0.
      */

      import { BeatFields } from '../../../common/search_strategy/index_fields';

      /* eslint-disable @typescript-eslint/naming-convention */
      export const fieldsBeat: BeatFields =
        ${JSON.stringify(beatFields, null, 2)};
  `;
  fs.writeFileSync(`${OUTPUT_SERVER_DIRECTORY}/fields.ts`, body, 'utf-8');
}

if (require.main === module) {
  main();
}
