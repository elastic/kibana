/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

module.exports = { report };

const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

const BaseDir = path.resolve(__dirname, '../../../../..');

const CloudDir = path.join(
  BaseDir,
  '../cloud/scala-services/adminconsole/src/main/resources/settings/kibana'
);

const DockerDir = path.join(
  BaseDir,
  'src/dev/build/tasks/os_packages/docker_generator/resources/base/bin'
);

// console.log(`_dirname:  ${__dirname}`);
// console.log(`BaseDir:   ${BaseDir}`);
// console.log(`CloudDir:  ${CloudDir}`);
// console.log(`DockerDir: ${DockerDir}`);

/** @typedef {{
 *   cloudFiles: string[];
 *   keyPrefixes: string[];
 * }} ReportOpts */

/** @type { (opts: ReportOpts) => Promise<void>) } */
async function report(opts) {
  // console.log(`report(${JSON.stringify(opts)})`);

  const cloudKeys = getCloudKeys({
    baseDir: CloudDir,
    files: opts.cloudFiles,
    keyPrefixes: opts.keyPrefixes,
  });

  const dockerKeys = getDockerKeys({
    baseDir: DockerDir,
    files: ['kibana-docker'],
    keyPrefixes: opts.keyPrefixes,
  });

  console.log('keys in cloud but not docker:');
  let printedAny = false;
  for (const key of cloudKeys.keys()) {
    const cloudKey = cloudKeys.get(key);
    if (dockerKeys.has(key)) continue;

    printedAny = true;
    console.log(`  ${key}`);
    logCloudVersion(cloudKey);
  }
  if (!printedAny) console.log(`  (none)`);

  console.log('');

  console.log('keys in docker but not cloud:');
  printedAny = false;
  for (const key of dockerKeys) {
    if (cloudKeys.has(key)) continue;

    printedAny = true;
    console.log(`  ${key}`);
  }
  if (!printedAny) console.log(`  (none)`);

  console.log('');

  console.log('keys in cloud with no min version:');
  printedAny = false;
  for (const key of cloudKeys) {
    const cloudKey = cloudKeys.get(key);
    if (!cloudKey) continue;

    const minVersion = getMinVersion(cloudKey);
    if (minVersion) continue;

    printedAny = true;
    console.log(`  ${key}`);
    logCloudVersion(cloudKey);
  }
  if (!printedAny) console.log(`  (none)`);

  console.log('');

  console.log('keys in both cloud and docker:');
  printedAny = false;
  for (const key of dockerKeys) {
    const cloudKey = cloudKeys.get(key);
    if (!cloudKey) continue;

    printedAny = true;
    console.log(`  ${key}`);
    logCloudVersion(cloudKey);
  }
  if (!printedAny) console.log(`  (none)`);
}

/** @type { (cloudKey: CloudKey) => void } */
function getMinVersion(cloudKey) {
  if (!cloudKey.version) return;
  return cloudKey.version.min;
}

/** @type { (cloudKey: CloudKey) => void } */
function logCloudVersion(cloudKey) {
  if (!cloudKey.version) return;

  /** @type { string[] } */
  const info = [];
  if (cloudKey.version.min) info.push(`min: ${cloudKey.version.min}`);
  if (cloudKey.version.max) info.push(`max: ${cloudKey.version.max}`);
  if (!info.length) return;

  console.log(`    ${info.join('; ')}`);
}

/** @typedef {{
 *   setting: string;
 *   version?: {
 *     min: string;
 *     max: string;
 *   }
 * }} CloudKey */

/** @typedef {{
 *   baseDir: string;
 *   files: string[];
 *   keyPrefixes: string[];
 * }} GetCloudKeys */

/** @type { (opts: GetCloudKeys) => Map<string, CloudKey> } */
function getCloudKeys(opts) {
  // console.log(`getCloudKeys(${JSON.stringify(opts)})`);

  /** @type { Map<string, CloudKey> } */
  const result = new Map();
  for (const file of opts.files) {
    const fullPath = path.join(opts.baseDir, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const object = yaml.safeLoad(content);

    for (const config of object.allowlist) {
      const name = normalizeCloudKeyName(config.setting);
      if (!startsWithKeyPrefix(opts.keyPrefixes, name)) continue;

      /** @type { CloudKey> } */
      const cloudKey = { key: name, setting: config.setting };

      if (config.version) cloudKey.version = {};
      if (config?.version.max) cloudKey.version.max = config.version.max;
      if (config?.version.min) cloudKey.version.min = config.version.min;

      result.set(name, cloudKey);
    }
  }

  return result;
}

/** @typedef {{
 *   baseDir: string;
 *   files: string[];
 *   keyPrefixes: string[];
 * }} GetDockerKeys */

/** @type { (opts: GetDockerKeys) => Set<string> } */
function getDockerKeys(opts) {
  // console.log(`getDockerKeys(${JSON.stringify(opts)})`);

  /** @type { Set<string> } */
  const result = new Set();
  for (const file of opts.files) {
    const fullPath = path.join(opts.baseDir, file);

    const lines = fs
      .readFileSync(fullPath, 'utf8')
      .split('\n')
      .map((line) => line.trim());

    for (const line of lines) {
      if (!startsWithKeyPrefix(opts.keyPrefixes, line)) continue;
      result.add(line);
    }
  }

  return result;
}

/** @type { (keyPrefixes: string[], string: string) => boolean } */
function startsWithKeyPrefix(keyPrefixes, string) {
  // console.log(`startsWithKeyPrefix(${JSON.stringify(keyPrefixes)}, ${string})`);
  for (const keyPrefix of keyPrefixes) {
    if (string.startsWith(keyPrefix)) return true;
  }
  return false;
}

/** @type { (string: string) => string } */
function normalizeCloudKeyName(string) {
  if (!string.startsWith('^')) return string;

  string = string.replace(/\^/g, '');
  string = string.replace(/\$/g, '');
  string = string.replace(/\\\./g, '.');
  return string;
}
