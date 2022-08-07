/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import type { WriteStream as TtyWriteStream } from 'tty';
import { stdin, stdout } from 'node:process';
import * as readline from 'node:readline';
import { blue, green, red } from 'chalk';
import { QuitChoice } from './common_choices';
import type { Choice } from './types';
import { ChoiceListFormatter } from './choice_list_formatter';
import { DataFormatter } from './data_formatter';
import { HORIZONTAL_LINE } from '../constants';

const CONTENT_MAX_WIDTH = HORIZONTAL_LINE.length - 1;
const CONTENT_60_PERCENT = Math.floor(CONTENT_MAX_WIDTH * 0.6);
const CONTENT_40_PERCENT = Math.floor(CONTENT_MAX_WIDTH * 0.4);

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
  private isPaused: boolean = false;
  private isHidden: boolean = true;

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
        ? `\n${new ChoiceListFormatter(choices, { layout: 'horizontal' }).output}\n`
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

      // TODO:PT experiment with using `rl.prompt()` instead of `question()` and possibly only initialize `rl` once

      rl.question(prompt ?? 'Enter choice: ', (selection) => {
        if (this.isPaused || this.isHidden) {
          return;
        }

        if (this.readlineInstance === rl) {
          this.clearPromptOutput();
          this.closeReadline();

          try {
            this.onEnterChoice(selection);
          } catch (error) {
            this.showMessage(error.message, 'red');

            resolve(this.askForChoice(prompt));

            return;
          }

          resolve();
        }
      });
    });
  }

  private clearScreen() {
    this.ttyOut.cursorTo(0, 0);
    this.ttyOut.clearScreenDown();
  }

  /**
   * Renders (or re-renders) the screen. Can be called multiple times
   *
   * @param prompt
   */
  public reRender(prompt?: string) {
    if (this.isHidden || this.isPaused) {
      return;
    }

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

    this.clearScreen();

    ttyOut.write(screenRenderInfo.output);

    this.askForChoice(prompt);
  }

  /**
   * Will display the screen and return a promise that is resolved once the screen is hidden.
   *
   * @param prompt
   * @param resume
   */
  public show({
    prompt,
    resume,
  }: Partial<{ prompt: string; resume: boolean }> = {}): Promise<void> {
    if (resume) {
      this.isPaused = false;
    }

    if (this.isPaused) {
      return Promise.resolve(undefined);
    }

    this.isHidden = false;
    this.reRender(prompt);

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
    this.closeReadline();
    this.clearScreen();
    this.screenRenderInfo = undefined;
    this.isHidden = true;
    this.isPaused = false;

    if (this.endSession) {
      this.endSession();
      this.showPromise = undefined;
      this.endSession = undefined;
    }
  }

  public pause() {
    this.isPaused = true;
    this.closeReadline();
  }
}

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
