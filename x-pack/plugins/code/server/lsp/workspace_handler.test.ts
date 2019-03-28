/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Git from '@elastic/nodegit';
import fs from 'fs';
import path from 'path';

import mkdirp from 'mkdirp';
import * as os from 'os';
import rimraf from 'rimraf';
import { ResponseMessage } from 'vscode-jsonrpc/lib/messages';
import { LspRequest } from '../../model';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';
import { WorkspaceHandler } from './workspace_handler';

const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code_test'));
const workspaceDir = path.join(baseDir, 'workspace');
const repoDir = path.join(baseDir, 'repo');

// @ts-ignore
Git.enableThreadSafety();

function handleResponseUri(wh: WorkspaceHandler, uri: string) {
  const dummyRequest: LspRequest = {
    method: 'textDocument/edefinition',
    params: [],
  };
  const dummyResponse: ResponseMessage = {
    id: null,
    jsonrpc: '',
    result: [
      {
        location: {
          uri,
        },
      },
    ],
  };
  wh.handleResponse(dummyRequest, dummyResponse);
  return dummyResponse.result[0].location.uri;
}

function makeAFile(
  workspacePath: string = workspaceDir,
  file = 'src/controllers/user.ts',
  repo = 'github.com/Microsoft/TypeScript-Node-Starter',
  revision = 'master'
) {
  const fullPath = path.join(workspacePath, repo, '__randomString', revision, file);
  mkdirp.sync(path.dirname(fullPath));
  fs.writeFileSync(fullPath, '');
  const strInUrl = fullPath
    .split(path.sep)
    .map(value => encodeURIComponent(value))
    .join('/');
  const uri = `file:///${strInUrl}`;
  return { repo, revision, file, uri };
}

test('file system url should be converted', async () => {
  const workspaceHandler = new WorkspaceHandler(
    repoDir,
    workspaceDir,
    // @ts-ignore
    null,
    new ConsoleLoggerFactory()
  );
  const { repo, revision, file, uri } = makeAFile(workspaceDir);
  const converted = handleResponseUri(workspaceHandler, uri);
  expect(converted).toBe(`git://${repo}/blob/${revision}/${file}`);
});

test('should support symbol link', async () => {
  const symlinkToWorkspace = path.join(baseDir, 'linkWorkspace');
  fs.symlinkSync(workspaceDir, symlinkToWorkspace, 'dir');
  // @ts-ignore
  const workspaceHandler = new WorkspaceHandler(
    repoDir,
    symlinkToWorkspace,
    // @ts-ignore
    null,
    new ConsoleLoggerFactory()
  );

  const { repo, revision, file, uri } = makeAFile(workspaceDir);
  const converted = handleResponseUri(workspaceHandler, uri);
  expect(converted).toBe(`git://${repo}/blob/${revision}/${file}`);
});

test('should support spaces in workspace dir', async () => {
  const workspaceHasSpaces = path.join(baseDir, 'work  space');
  const workspaceHandler = new WorkspaceHandler(
    repoDir,
    workspaceHasSpaces,
    // @ts-ignore
    null,
    new ConsoleLoggerFactory()
  );
  const { repo, revision, file, uri } = makeAFile(workspaceHasSpaces);
  const converted = handleResponseUri(workspaceHandler, uri);
  expect(converted).toBe(`git://${repo}/blob/${revision}/${file}`);
});

test('should throw a error if url is invalid', async () => {
  const workspaceHandler = new WorkspaceHandler(
    repoDir,
    workspaceDir,
    // @ts-ignore
    null,
    new ConsoleLoggerFactory()
  );
  const invalidDir = path.join(baseDir, 'invalid_dir');
  const { uri } = makeAFile(invalidDir);
  expect(() => handleResponseUri(workspaceHandler, uri)).toThrow();
});

async function prepareProject(repoPath: string) {
  mkdirp.sync(repoPath);
  const repo = await Git.Repository.init(repoPath, 0);
  const content = 'console.log("test")';
  const subFolder = 'src';
  fs.mkdirSync(path.join(repo.workdir(), subFolder));
  fs.writeFileSync(path.join(repo.workdir(), 'src/app.ts'), content, 'utf8');

  const index = await repo.refreshIndex();
  await index.addByPath('src/app.ts');
  index.write();
  const treeId = await index.writeTree();
  const committer = Git.Signature.create('tester', 'test@test.com', Date.now() / 1000, 60);
  const commit = await repo.createCommit(
    'HEAD',
    committer,
    committer,
    'commit for test',
    treeId,
    []
  );
  return { repo, commit };
}

test('should throw a error if file path is external', async () => {
  const workspaceHandler = new WorkspaceHandler(
    repoDir,
    workspaceDir,
    // @ts-ignore
    null,
    new ConsoleLoggerFactory()
  );
  const repoUri = 'github.com/microsoft/typescript-node-starter';
  await prepareProject(path.join(repoDir, repoUri));
  const externalFile = 'node_modules/abbrev/abbrev.js';
  const request: LspRequest = {
    method: 'textDocument/hover',
    params: {
      position: {
        line: 8,
        character: 23,
      },
      textDocument: {
        uri: `git://${repoUri}/blob/master/${externalFile}`,
      },
    },
  };
  await expect(workspaceHandler.handleRequest(request)).rejects.toEqual(
    new Error('invalid fle path in requests.')
  );
});

beforeAll(() => {
  mkdirp.sync(workspaceDir);
  mkdirp.sync(repoDir);
});

afterAll(() => {
  rimraf.sync(baseDir);
});
