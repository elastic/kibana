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
import { EventEmitter } from 'events';

export class CtagsRunner {
  private ctags?: ChildProcess;
  private ctagsReader?: CtagsReader;
  private isRunning: boolean = false;
  private eventEmitter = new EventEmitter();
  private tags: Tag[] = [];
  private readonly logger: Logger;
  private readonly CTAGS_FILTER_TERMINATOR: string = '__ctags_done_with_file__';

  constructor (
    readonly options: ServerOptions,
    readonly loggerFactory: LoggerFactory
  ) {
    this.logger = loggerFactory.getLogger(['ctags runner']);
    this.ctagsReader = new CtagsReader(loggerFactory);
    this.initialize();
  }

  private initialize() {
    this.ctags = spawn('ctags', ['-u', '--filter=yes', '--fields=-anf+iKnS', `--filter-terminator=${this.CTAGS_FILTER_TERMINATOR}\n`]);
    this.isRunning = true;
    this.ctags.stdin.setDefaultEncoding('utf-8');
    const readline = require('readline');
    const rl = readline.createInterface({
      input: this.ctags.stdout
    });
    rl.on('line', (line: string) => {
      if (this.CTAGS_FILTER_TERMINATOR === line) {
        return;
      }

      if (line.endsWith(this.CTAGS_FILTER_TERMINATOR)) {
        this.logger.stderr('ctags encountered a problem while generating tags for the file. The index will be incomplete.');
        return;
      }
      this.ctagsReader!.readLine(line);
    });
    this.ctags.stderr.on('data', data => {
      this.logger.stderr(data.toString());
    });
    this.ctags.on('close', code => {
      this.logger.stdout(`ctags process exits with code ${code}`);
    })
    this.ctags.on('exit', () => {
      this.tags.push(...this.ctagsReader!.getTags());
      this.logger.stdout('exit');
      this.isRunning = false;
      this.eventEmitter.emit('exit');
    })
  }

  public doCtags(filePath: string) {
    if (!this.isRunning) {
      this.initialize();
    }
    this.ctags!.stdin.write(`${filePath}\n`);
  }

  public exit() {
    if (this.isRunning) {
      this.ctags!.stdin.end();
    }
  }

  public async getAllTags() {
    return new Promise<Tag[]>(resolve => {
      this.eventEmitter.on('exit', () => {
        resolve(this.tags);
      })
    });
  }

}
