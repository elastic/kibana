/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WriteStream as TtyWriteStream } from 'tty';
import { stdout, stdin } from 'node:process';
import readline from 'readline';
import { HORIZONTAL_LINE } from '../../common/constants';

export class ScreenBaseClass {
  private readonly ttyOut: TtyWriteStream = stdout;

  protected header(): string {
    return HORIZONTAL_LINE;
  }

  protected footer(): string {
    return `

  [Q] Quit
${HORIZONTAL_LINE}
`;
  }

  protected screen(): string {
    throw new Error(`${this.constructor.name}.screen() not implemented!`);
  }

  protected onEnterChoice(choice: string) {
    throw new Error(`${this.constructor.name}.onEnterChoice() not implemented!`);
  }

  show() {
    const { ttyOut } = this;

    ttyOut.moveCursor(0, 0);
    ttyOut.clearScreenDown();
    ttyOut.write(this.header());
    ttyOut.write(this.screen());
    ttyOut.write(this.footer());

    const rl = readline.createInterface({ input: stdin, output: stdout });
    rl.question('Enter choice: ', (selection) => {
      this.onEnterChoice(selection);
    });
  }

  hide() {
    const { ttyOut } = this;
    ttyOut.moveCursor(0, 0);
    ttyOut.clearScreenDown();
  }
}
