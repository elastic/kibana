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
import { ChoiceListFormatter } from './choice_list_formatter';
import { DataFormatter } from './data_formatter';
import { HORIZONTAL_LINE } from '../../../common/constants';

export interface Choice {
  key: string;
  title: string;
}

export const QuitChoice: Choice = {
  key: 'Q',
  title: 'Quit',
} as const;

export const isChoice = (item: string | object): item is Choice => {
  return 'string' !== typeof item && 'key' in item && 'title' in item;
};

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

/**
 * Base class for creating a CLI screen.
 *
 * @example
 *
 *  // Screen definition
 *  export class FooScreen extends ScreenBaseClass {
 *    protected body() {
 *      return `this is a test screen`
 *    }
 *
 *    protected onEnterChoice(choice) {
 *      if (choice.toUpperCase() === 'Q') {
 *        this.hide();
 *        return;
 *      }
 *
 *      this.throwUnknownChoiceError(choice);
 *    }
 *  }
 *
 *  // Using the screen
 *  await new FooScreen().show()
 */
export class ScreenBaseClass {
  private readonly ttyOut: TtyWriteStream = stdout;
  private readlineInstance: readline.Interface | undefined = undefined;
  private showPromise: Promise<void> | undefined = undefined;
  private endSession: (() => void) | undefined = undefined;
  private screenRenderInfo: RenderedScreen | undefined;

  /**
   * Provides content for the header of the screen.
   *
   * @param title Displayed on the left side of the header area
   * @param subTitle Displayed to the right of the header
   * @protected
   */
  protected header(title: string = '', subTitle: string = ''): string | DataFormatter {
    const paddedTitle = title ? ` ${title}`.padEnd(CONTENT_60_PERCENT) : '';
    const paddedSubTitle = subTitle ? `| ${`${subTitle} `.padStart(CONTENT_40_PERCENT)}` : '';

    return title || subTitle
      ? `${HORIZONTAL_LINE}\n${paddedTitle}${
          subTitle ? `${paddedSubTitle}` : ''
        }\n${HORIZONTAL_LINE}`
      : HORIZONTAL_LINE;
  }

  /**
   * Provides content for the footer of the screen
   *
   * @param choices Optional list of choices for display above the footer.
   * @protected
   */
  protected footer(choices: Choice[] = [QuitChoice]): string | DataFormatter {
    const displayChoices =
      choices && choices.length
        ? new ChoiceListFormatter(choices, { layout: 'horizontal' }).output
        : '';

    return `

  ${displayChoices}${HORIZONTAL_LINE}`;
  }

  /**
   * Content for the Body area of the screen
   *
   * @protected
   */
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

  /**
   * Throw an error indicating invalid choice was made by the user.
   * @param choice
   * @protected
   */
  protected throwUnknownChoiceError(choice: string): never {
    throw new Error(`Unknown choice: ${choice}`);
  }

  protected getOutputContent(item: string | DataFormatter): string {
    return item instanceof DataFormatter ? item.output : item;
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

      // TODO:PT experiment with using `rl.promp()` instead of `question()`

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

  /**
   * Will display the screen and return a promise that is resolved once that screen is hidden
   */
  public show(): Promise<void> {
    const { ttyOut } = this;
    const headerContent = this.header();
    const bodyContent = this.body();
    const footerContent = this.footer();

    const screenRenderInfo = new RenderedScreen(
      this.getOutputContent(headerContent) +
        this.getOutputContent(bodyContent) +
        this.getOutputContent(footerContent)
    );
    this.screenRenderInfo = screenRenderInfo;

    ttyOut.cursorTo(0, 0);
    ttyOut.clearScreenDown();

    ttyOut.write(screenRenderInfo.output);

    this.askForChoice();

    // `show()` can be called multiple times, so only create the `showPromise` if one is not already present
    if (!this.showPromise) {
      this.showPromise = new Promise((resolve) => {
        this.endSession = () => resolve();
      });
    }

    return this.showPromise;
  }

  /**
   * Will hide the screen and fulfill the promise returned by `.show()`
   */
  public hide() {
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
}
