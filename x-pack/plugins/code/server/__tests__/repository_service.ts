/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import assert from 'assert';
// import { generateKeyPairSync } from 'crypto';
import fs from 'fs';
import * as os from 'os';
import path from 'path';
import rimraf from 'rimraf';
import { RepositoryUtils } from '../../common/repository_utils';
import { RepositoryService } from '../repository_service';
import { ConsoleLogger } from '../utils/console_logger';

describe('repository service test', () => {
  const log = new ConsoleLogger();
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code_test'));
  const repoDir = path.join(baseDir, 'repo');
  const credsDir = path.join(baseDir, 'credentials');
  // @ts-ignore
  before(() => {
    fs.mkdirSync(credsDir);
    fs.mkdirSync(repoDir);
  });
  // @ts-ignore
  after(() => {
    return rimraf.sync(baseDir);
  });
  const service = new RepositoryService(repoDir, credsDir, log, false /* enableGitCertCheck */);

  it('can not clone a repo by ssh without a key', async () => {
    const repo = RepositoryUtils.buildRepository(
      'git@github.com:elastic/TypeScript-Node-Starter.git'
    );
    await assert.rejects(service.clone(repo));
    // @ts-ignore
  }).timeout(60000);

  /* it('can clone a repo by ssh with a key', async () => {

    const repo = RepositoryUtils.buildRepository('git@github.com:elastic/code.git');
     const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'pkcs1',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs1',
        format: 'pem',
      },
    });
    fs.writeFileSync(path.join(credsDir, 'id_rsa.pub'), publicKey);
    fs.writeFileSync(path.join(credsDir, 'id_rsa'), privateKey);
    const result = await service.clone(repo);
    assert.ok(fs.existsSync(path.join(repoDir, result.repo.uri)));
  }).timeout(60000); */
});
