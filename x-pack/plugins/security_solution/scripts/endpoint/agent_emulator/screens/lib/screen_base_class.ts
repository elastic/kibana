/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import type { WriteStream as TtyWriteStream } from 'tty';
import { stdout, stdin } from 'node:process';
import * as readline from 'node:readline';
import { red, blue, green } from 'chalk';
import { DataFormatter } from './data_formatter';
import { HORIZONTAL_LINE } from '../../../common/constants';

export interface Choice {
  key: string;
  title: string;
}

const CONTENT_MAX_WIDTH = HORIZONTAL_LINE.length - 1;
const CONTENT_60_PERCENT = Math.floor(CONTENT_MAX_WIDTH * 0.6);
const CONTENT_40_PERCENT = Math.floor(CONTENT_MAX_WIDTH * 0.4);

class RenderedScreen {
  public statusPos: number = -1;
  public promptPos: number = -1;
  public statusMessage: string | undefined = undefined;

  constructor(private readonly screenOutput: string) {
    const outputBottomPos = screenOutput.split('\n').length - 1;
    this.statusPos = outputBottomPos + 1;
    this.promptPos = this.statusPos + 1;
  }

  public get output(): string {
    return `${this.screenOutput}\n${this.statusMessage ?? ' '}\n`;
  }
}

export class ScreenBaseClass {
  private readonly ttyOut: TtyWriteStream = stdout;
  private readlineInstance: readline.Interface | undefined = undefined;
  private endSession: (() => void) | undefined = undefined;
  private screenRenderInfo: RenderedScreen | undefined;

  protected header(title: string = '', subTitle: string = ''): string | DataFormatter {
    const paddedTitle = title ? ` ${title}`.padEnd(CONTENT_60_PERCENT) : '';
    const paddedSubTitle = subTitle ? `| ${`${subTitle} `.padStart(CONTENT_40_PERCENT)}` : '';

    return title || subTitle
      ? `${HORIZONTAL_LINE}\n${paddedTitle}${
          subTitle ? `${paddedSubTitle}` : ''
        }\n${HORIZONTAL_LINE}`
      : HORIZONTAL_LINE;
  }

  protected footer(): string | DataFormatter {
    return `

  [Q] Quit\n${HORIZONTAL_LINE}`;
  }

  protected body(): string | DataFormatter {
    return '\n\n(This screen has no content)\n\n';
  }

  /**
   * Should be defined by the subclass to handle user selections. If the user's
   * selection is invalid, this method should `throw` and `Error` - the message
   * will be displayed in the screen and the user will be asked for input again.
   *
   * @param choice
   * @protected
   */
  protected onEnterChoice(choice: string) {
    throw new Error(`${this.constructor.name}.onEnterChoice() not implemented!`);
  }

  private closeReadline() {
    if (this.readlineInstance) {
      this.readlineInstance.close();
      this.readlineInstance = undefined;
    }
  }

  private showMessage(message: string, color: 'blue' | 'red' | 'green' = 'blue') {
    const { screenRenderInfo, ttyOut } = this;

    if (screenRenderInfo) {
      ttyOut.cursorTo(0, screenRenderInfo.statusPos);
      ttyOut.clearLine(0);

      let coloredMessage = message;

      switch (color) {
        case 'green':
          coloredMessage = green(`(+) ${message}`);
          break;
        case 'red':
          coloredMessage = red(`(x) ${message}`);
          break;

        case 'blue':
          coloredMessage = blue(`(i) ${message}`);
          break;
      }

      ttyOut.write(` ${coloredMessage}`);
    }
  }

  private clearPromptOutput() {
    const { ttyOut, screenRenderInfo } = this;

    if (screenRenderInfo) {
      ttyOut.cursorTo(0, screenRenderInfo.promptPos ?? 0);
      ttyOut.clearScreenDown();
    }
  }

  private async askForChoice(prompt?: string): Promise<void> {
    this.closeReadline();
    this.clearPromptOutput();

    return new Promise((resolve) => {
      const rl = readline.createInterface({ input: stdin, output: stdout });
      this.readlineInstance = rl;

      rl.question(prompt ?? 'Enter choice: ', (selection) => {
        if (this.readlineInstance === rl) {
          this.clearPromptOutput();
          this.closeReadline();

          try {
            this.onEnterChoice(selection);
          } catch (error) {
            this.showMessage(error.message, 'red');

            resolve(this.askForChoice());

            return;
          }

          resolve();
        }
      });
    });
  }

  show(): Promise<void> {
    const { ttyOut } = this;
    const headerContent = this.header();
    const bodyContent = this.body();
    const footerContent = this.footer();

    const screenRenderInfo = new RenderedScreen(
      (headerContent instanceof DataFormatter ? headerContent.output : headerContent) +
        (bodyContent instanceof DataFormatter ? bodyContent.output : bodyContent) +
        (footerContent instanceof DataFormatter ? footerContent.output : footerContent)
    );
    this.screenRenderInfo = screenRenderInfo;

    ttyOut.cursorTo(0, 0);
    ttyOut.clearScreenDown();

    ttyOut.write(screenRenderInfo.output);

    this.askForChoice();

    return new Promise((resolve) => {
      this.endSession = () => resolve();
    });
  }

  hide() {
    const { ttyOut } = this;
    this.closeReadline();
    ttyOut.cursorTo(0, 0);
    ttyOut.clearScreenDown();
    this.screenRenderInfo = undefined;

    if (this.endSession) {
      this.endSession();
      this.endSession = undefined;
    }
  }

  protected throwUnknownChoiceError(choice: string): never {
    throw new Error(`Unknown choice: ${choice}`);
  }
}
