/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */

import fs from 'fs';
// @ts-ignore
import * as sl from 'stats-lite';
import _ from 'lodash';
import papa from 'papaparse';

import { InstallManager } from './install_manager';
import { JavaLauncher } from './java_launcher';
import { JAVA, TYPESCRIPT } from './language_servers';
import { RequestExpander } from './request_expander';
import { TypescriptServerLauncher } from './ts_launcher';
import { GitOperations } from '../git_operations';
import { createTestServerOption } from '../test_utils';
import { ConsoleLoggerFactory } from '../utils/console_logger_factory';
import { RepositoryUtils } from '../../common/repository_utils';
import { LspRequest } from '../../model';
import { Repo, RequestType } from '../../model/test_config';

const requestTypeMapping = new Map<number, string>([
  [RequestType.FULL, 'full'],
  [RequestType.HOVER, 'hover'],
  [RequestType.INITIALIZE, 'initialize'],
]);

interface Result {
  repoName: string;
  startTime: number;
  numberOfRequests: number;
  rps: number;
  OK: number;
  KO: number;
  KORate: string;
  latency_max: number;
  latency_min: number;
  latency_medium: number;
  latency_95: number;
  latency_99: number;
  latency_avg: number;
  latency_std_dev: number;
}

const serverOptions = createTestServerOption();

export class LspTestRunner {
  private repo: Repo;
  public result: Result;
  public proxy: RequestExpander | null;
  private requestType: RequestType;
  private times: number;

  constructor(repo: Repo, requestType: RequestType, times: number) {
    this.repo = repo;
    this.requestType = requestType;
    this.times = times;
    this.proxy = null;
    this.result = {
      repoName: `${repo.url}`,
      startTime: 0,
      numberOfRequests: times,
      rps: 0,
      OK: 0,
      KO: 0,
      KORate: '',
      latency_max: 0,
      latency_min: 0,
      latency_medium: 0,
      latency_95: 0,
      latency_99: 0,
      latency_avg: 0,
      latency_std_dev: 0,
    };
    if (!fs.existsSync(serverOptions.workspacePath)) {
      fs.mkdirSync(serverOptions.workspacePath);
    }
  }

  public async sendRandomRequest() {
    const repoPath: string = this.repo.path;
    const files = await this.getAllFile();
    const randomFile = files[Math.floor(Math.random() * files.length)];
    await this.proxy!.initialize(repoPath);
    switch (this.requestType) {
      case RequestType.HOVER: {
        const req: LspRequest = {
          method: 'textDocument/hover',
          params: {
            textDocument: {
              uri: `file://${this.repo.path}/${randomFile}`,
            },
            position: this.randomizePosition(),
          },
        };
        await this.launchRequest(req);
        break;
      }
      case RequestType.INITIALIZE: {
        this.proxy!.initialize(repoPath);
        break;
      }
      case RequestType.FULL: {
        const req: LspRequest = {
          method: 'textDocument/full',
          params: {
            textDocument: {
              uri: `file://${this.repo.path}/${randomFile}`,
            },
            reference: false,
          },
        };
        await this.launchRequest(req);
        break;
      }
      default: {
        console.error('Unknown request type!');
        break;
      }
    }
  }

  private async launchRequest(req: LspRequest) {
    this.result.startTime = Date.now();
    let OK: number = 0;
    let KO: number = 0;
    const responseTimes = [];
    for (let i = 0; i < this.times; i++) {
      try {
        const start = Date.now();
        await this.proxy!.handleRequest(req);
        responseTimes.push(Date.now() - start);
        OK += 1;
      } catch (e) {
        KO += 1;
      }
    }
    this.result.KO = KO;
    this.result.OK = OK;
    this.result.KORate = ((KO / this.times) * 100).toFixed(2) + '%';
    this.result.rps = this.times / (Date.now() - this.result.startTime);
    this.collectMetrics(responseTimes);
  }

  private collectMetrics(responseTimes: number[]) {
    this.result.latency_max = Math.max.apply(null, responseTimes);
    this.result.latency_min = Math.min.apply(null, responseTimes);
    this.result.latency_avg = sl.mean(responseTimes);
    this.result.latency_medium = sl.median(responseTimes);
    this.result.latency_95 = sl.percentile(responseTimes, 0.95);
    this.result.latency_99 = sl.percentile(responseTimes, 0.99);
    this.result.latency_std_dev = sl.stdev(responseTimes).toFixed(2);
  }

  public dumpToCSV(resultFile: string) {
    const newResult = _.mapKeys(this.result as _.Dictionary<any>, (v, k) => {
      if (k !== 'repoName') {
        return `${requestTypeMapping.get(this.requestType)}_${k}`;
      } else {
        return 'repoName';
      }
    });
    if (!fs.existsSync(resultFile)) {
      console.log(papa.unparse([newResult]));
      fs.writeFileSync(resultFile, papa.unparse([newResult]));
    } else {
      const file = fs.createReadStream(resultFile);
      papa.parse(file, {
        header: true,
        complete: parsedResult => {
          const originResults = parsedResult.data;
          const index = originResults.findIndex(originResult => {
            return originResult.repoName === newResult.repoName;
          });
          if (index === -1) {
            originResults.push(newResult);
          } else {
            originResults[index] = { ...originResults[index], ...newResult };
          }
          fs.writeFileSync(resultFile, papa.unparse(originResults));
        },
      });
    }
  }

  private async getAllFile() {
    const gitOperator: GitOperations = new GitOperations(this.repo.path);
    try {
      const fileTree = await gitOperator.fileTree(
        '',
        '',
        'HEAD',
        0,
        Number.MAX_SAFE_INTEGER,
        false,
        Number.MAX_SAFE_INTEGER
      );
      return RepositoryUtils.getAllFiles(fileTree).filter((filePath: string) => {
        return filePath.endsWith(this.repo.language);
      });
    } catch (e) {
      console.error(`get files error: ${e}`);
      throw e;
    }
  }

  private randomizePosition() {
    // TODO:pcxu randomize position according to source file
    return {
      line: 19,
      character: 2,
    };
  }

  public async launchLspByLanguage() {
    switch (this.repo.language) {
      case 'java': {
        this.proxy = await this.launchJavaLanguageServer();
        break;
      }
      case 'ts': {
        this.proxy = await this.launchTypescriptLanguageServer();
        break;
      }
      default: {
        console.error('unknown language type');
        break;
      }
    }
  }

  private async launchTypescriptLanguageServer() {
    const launcher = new TypescriptServerLauncher(
      '127.0.0.1',
      serverOptions,
      new ConsoleLoggerFactory()
    );
    return await launcher.launch(false, 1, TYPESCRIPT.embedPath!);
  }

  private async launchJavaLanguageServer() {
    const launcher = new JavaLauncher('127.0.0.1', serverOptions, new ConsoleLoggerFactory());
    // @ts-ignore
    const installManager = new InstallManager(null, serverOptions);
    return await launcher.launch(false, 1, installManager.installationPath(JAVA));
  }
}
