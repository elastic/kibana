/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ChildProcess, spawn } from 'child_process';
import { ServerOptions } from '../server_options';
import { LoggerFactory } from '../utils/log_factory';
import { CtagsReader } from './ctags_reader';
import { Logger } from '../log';
import { Tag } from '../../model';

export class CtagsRunner {
  private ctags: ChildProcess;
  private ctagsReader: CtagsReader;
  private tags: Tag[] = [];
  private readonly logger: Logger;
  private readonly CTAGS_FILTER_TERMINATOR: string = '__ctags_done_with_file__';

  constructor (
    readonly options: ServerOptions,
    readonly loggerFactory: LoggerFactory
  ) {
    this.logger = loggerFactory.getLogger(['ctags runner']);
    this.ctags = spawn('ctags', ['-u', '--filter=yes', '--fields=-anf+iKnS', `--filter-terminator=${this.CTAGS_FILTER_TERMINATOR}\n`]);
    this.ctags.stdin.setDefaultEncoding('utf-8');
    this.ctagsReader = new CtagsReader(loggerFactory);
    const readline = require('readline');
    const rl = readline.createInterface({
      input: this.ctags.stdout
    });
    rl.on('line', (line: string) => {
      this.ctagsReader.readLine(line);
    });
    this.ctags.stderr.on('data', data => {
      this.logger.stderr(data.toString());
    });
    this.ctags.on('close', code => {
      this.logger.stdout(`ctags process exits with code ${code}`);
    })
    this.ctags.on('exit', () => {
      this.ctagsReader.getTags().forEach(t => this.logger.stdout(JSON.stringify(t)));
      this.tags.concat(this.ctagsReader.getTags());
      this.logger.stdout('exit');
    })
  }

  public async doCtags(filePath: string) {
    if (this.ctags !== undefined) {
      this.ctags.stdin.write(`${filePath}\n`);
      this.ctags.stdin.end();
    }
  }

  public getAllTags(): Tag[] {
    return this.tags;
  }


}
