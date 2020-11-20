/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** @typedef { import('./types').Deployment } Deployment */
/** @typedef { import('./types').CreateDeploymentOptions } CreateDeploymentOptions */
/** @typedef { import('./types').CreateDeploymentResult } CreateDeploymentResult */
/** @typedef { import('./types').GetDeploymentOptions } GetDeploymentOptions */
/** @typedef { import('./types').GetDeploymentResult } GetDeploymentResult */
/** @typedef { import('./types').DeleteDeploymentOptions } DeleteDeploymentOptions */

const { writeFileSync, unlinkSync } = require('fs');
const { execFile } = require('child_process');
const tempy = require('tempy');
const pkg = require('../package.json');
const logger = require('./logger');
const { resolveable } = require('./utils');

module.exports = {
  createDeployment,
  deleteDeployment,
  getDeployment,
  listDeployments,
  listStacks,
  listTemplates,
};

/** @type { (options: CreateDeploymentOptions) => Promise<CreateDeploymentResult> } */
async function createDeployment({
  config,
  stack,
  name,
  deploymentName,
  esSize,
  kbSize,
  tmMaxWorkers,
  tmPollInterval,
}) {
  let args = ['deployment', 'create'];
  args.push('--config', config);
  if (stack) args.push('--version', stack);
  args.push('--message', `${pkg.name}: creating deployment ${name}`);
  args.push('--output', 'json');
  args.push('--name', deploymentName);
  args.push('--es-size', `${esSize}g`);
  args.push('--kibana-size', `${kbSize}g`);
  args.push('--generate-payload');

  // generate the payload to create the deployment
  const payload = await ecctlRun(args);

  /** @type { Record<string, any> } */
  const configOverridesJSON = {};
  if (tmMaxWorkers !== 10) configOverridesJSON['xpack.task_manager.max_workers'] = tmMaxWorkers;
  if (tmPollInterval !== 3000)
    configOverridesJSON['xpack.task_manager.poll_interval'] = tmPollInterval;

  if (Object.keys(configOverridesJSON).length !== 0) {
    payload.resources.kibana[0].plan.kibana.user_settings_override_json = configOverridesJSON;
  }

  // write the create deployment payload to a file and deploy it
  const tmpFile = tempy.file({ extension: 'json' });
  writeFileSync(tmpFile, JSON.stringify(payload, null, 4));

  args = ['deployment', 'create'];
  args.push('--config', config);
  args.push('--file', tmpFile);

  const result = asCreateDeploymentResult(await ecctlRun(args));
  unlinkSync(tmpFile);
  return result;
}

/** @type { (options: GetDeploymentOptions) => Promise<GetDeploymentResult> } */
async function getDeployment({ config, name, id }) {
  const args = ['deployment', 'show', id];
  args.push('--config', config);
  args.push('--message', `${pkg.name}: getting deployment ${id} ${name}`);
  args.push('--output', 'json');

  return asGetDeploymentResult(await ecctlRun(args));
}

/** @type { (options: DeleteDeploymentOptions) => Promise<any> } */
async function deleteDeployment({ config, id, name }) {
  const args = ['deployment', 'shutdown', id];
  args.push('--config', config);
  args.push('--message', `${pkg.name}: deleting deployment ${id} ${name}`);
  args.push('--output', 'json');
  args.push('--force');
  args.push('--skip-snapshot');

  return await ecctlRun(args);
}

/** @type { ({ config }: { config: string }) => Promise<any> } */
async function listDeployments({ config }) {
  const args = ['deployment', 'list'];
  args.push('--config', config);
  args.push('--message', `${pkg.name}: listing deployments`);
  args.push('--output', 'json');

  return await ecctlRun(args);
}

/** @type { ({ config }: { config: string }) => Promise<any> } */
async function listStacks({ config }) {
  const args = ['stack', 'list'];
  args.push('--config', config);
  args.push('--message', `${pkg.name}: listing stacks`);
  args.push('--output', 'json');

  return await ecctlRun(args);
}

// used to get list of possible memory configurations
/** @type { (options: { config: string }) => Promise<any> } */
async function listTemplates({ config }) {
  const args = ['deployment', 'template', 'list'];
  args.push('--config', config);
  args.push('--message', `${pkg.name}: listing template`);
  args.push('--output', 'json');

  return await ecctlRun(args);
}

/** @type { (args: string[]) => Promise<any> } */
async function ecctlRun(args) {
  const file = 'ecctl';
  const result = resolveable();
  const execOptions = {
    maxBuffer: 20 * 1000 * 1000,
    encoding: 'utf8',
  };
  const errMessagePrefix = `error running "${file} ${args.join(' ')}"`;

  try {
    execFile(file, args, execOptions, (err, stdout, stderr) => {
      if (err) {
        logger.debug(`${errMessagePrefix}: stderr:\n${stderr}`);
        return result.reject(`${errMessagePrefix}: ${err}}`);
      }

      try {
        return result.resolve(JSON.parse(stdout));
      } catch (err) {
        logger.debug(`${errMessagePrefix}: error parsing JSON: ${err}:\n${stdout}`);
        return result.reject(`${errMessagePrefix}: error parsing JSON: ${err}}`);
      }
    });
  } catch (err) {
    result.reject(`${errMessagePrefix}: ${err}}`);
  }

  return result.promise;
}

/** @type { (result: any) => CreateDeploymentResult } */
function asCreateDeploymentResult(result) {
  if (result == null) throw new Error('unexpected null from create deployment');
  if (result.id == null) throw new Error('id null from create deployment');

  const id = `${result.id}`;
  /** @type { any[] } */
  const resources = result.resources || [];
  const esResource = resources.find((resource) => resource.kind === 'elasticsearch');
  if (esResource == null) throw new Error('no elasticsearch resource from create deployment');

  const credentials = esResource.credentials || {};
  const username = credentials.username;
  const password = credentials.password;
  if (username == null) throw new Error('username not set from create deploymeent');
  if (password == null) throw new Error('password not set from create deployment');

  return { id, username, password };
}

/** @type { (result: any) => GetDeploymentResult } */
function asGetDeploymentResult(result) {
  if (result == null) throw new Error('unexpected null from get deployment');
  if (result.resources == null) throw new Error('unexpected null resources from get deployment');

  // return a deep copy
  const esInfo = getResourceInfo('elasticsearch', result);
  const kbInfo = getResourceInfo('kibana', result);
  const healthy =
    esInfo.healthy && esInfo.status === 'started' && kbInfo.healthy && kbInfo.status === 'started';
  const status = [
    `es: ${esInfo.healthy ? 'healthy' : 'unhealthy'}: ${esInfo.status}`,
    `kb: ${esInfo.healthy ? 'healthy' : 'unhealthy'}: ${kbInfo.status}`,
  ].join('; ');

  return {
    healthy,
    status,
    esEndpoint: esInfo.endpoint,
    esPort: esInfo.port,
    kbEndpoint: kbInfo.endpoint,
    kbPort: kbInfo.port,
    version: esInfo.version,
    zone: esInfo.zone,
  };
}

/** @type { (key: string, result: any) => { endpoint: string, port: number, healthy: boolean, status: string, version: string, zone: string } } */
function getResourceInfo(key, showDeployment) {
  const allResources = (showDeployment || {}).resources || {};
  const resource = (allResources[key] || [])[0] || {};

  const info = resource.info || {};
  const healthy = !!(info.healthy || false);
  const status = `${info.status || 'unknown'}`;

  const metadata = info.metadata || {};
  const endpoint = `${metadata.endpoint}`;
  const port = parseInt(metadata.ports.https, 10);

  const topology = info.topology || {};
  const instance = (topology.instances || [])[0] || {};
  const version = instance.service_version || 'unknown';
  const zone = instance.zone || 'unknown';

  return { endpoint, port, healthy, status, version, zone };
}
