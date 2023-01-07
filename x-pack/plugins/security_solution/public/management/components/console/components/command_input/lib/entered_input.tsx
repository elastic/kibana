/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import type { MaybeImmutable } from '../../../../../../../common/endpoint/types';
import { ArgumentSelectorWrapper } from '../components/argument_selector_wrapper';
import type { ParsedCommandInterface } from '../../../service/types';
import type { EnteredCommand } from '../../console_state/types';

/**
 * Class that manages the command entered and how that is displayed to the left and right of the cursor
 */
export class EnteredInput {
  private leftOfCursorContent: ReactNode[];
  private rightOfCursorContent: ReactNode[];

  constructor(
    private leftOfCursorText: string,
    private rightOfCursorText: string,
    parsedInput_: MaybeImmutable<ParsedCommandInterface>,
    enteredCommand: undefined | MaybeImmutable<EnteredCommand>
  ) {
    // Cast the `parseInput` to remove `Immutable` type from it
    const parsedInput = parsedInput_ as ParsedCommandInterface;

    this.leftOfCursorContent = leftOfCursorText.split('');
    this.rightOfCursorContent = rightOfCursorText.split('');

    // Determine if any argument value selector should be inserted
    if (parsedInput.hasArgs && enteredCommand && enteredCommand.argsWithValueSelectors) {
      const inputPieces = [
        {
          input: leftOfCursorText,
          items: this.leftOfCursorContent,
        },
        {
          input: rightOfCursorText,
          items: this.rightOfCursorContent,
        },
      ];

      for (const [argName, argDef] of Object.entries(enteredCommand.argsWithValueSelectors)) {
        // Loop through the input pieces (left and right side of cursor) looking for the Argument name
        for (const { input, items } of inputPieces) {
          // TODO:PT Support multiple occurrences of the argument

          const argNameMatch = `--${argName}`;
          const pos = input.indexOf(argNameMatch);

          if (parsedInput.hasArg(argName) && pos !== -1) {
            const argChrLength = argNameMatch.length;
            const replaceValues: ReactNode[] = Array.from({ length: argChrLength }, () => null);

            replaceValues[0] = <ArgumentSelectorWrapper argName={argName} argDefinition={argDef} />;

            items.splice(pos, argChrLength, ...replaceValues);
          }
        }
      }
    }
  }

  private replaceSelection(selection: string, newValue: string) {
    const prevFullTextEntered = this.leftOfCursorText + this.rightOfCursorText;

    this.leftOfCursorText =
      prevFullTextEntered.substring(0, prevFullTextEntered.indexOf(selection)) + newValue;

    this.rightOfCursorText = prevFullTextEntered.substring(
      prevFullTextEntered.indexOf(selection) + selection.length
    );
  }

  getLeftOfCursorText(): string {
    return this.leftOfCursorText;
  }

  getRightOfCursorText(): string {
    return this.rightOfCursorText;
  }

  getFullText(): string {
    return this.leftOfCursorText + this.rightOfCursorText;
  }

  getLeftOfCursorRenderingContent(): ReactNode {
    return (
      <>
        {this.leftOfCursorContent.map((item, index) => {
          return <React.Fragment key={`left.${index}`}>{item}</React.Fragment>;
        })}
      </>
    );
  }

  getRightOfCursorRenderingContent(): ReactNode {
    return (
      <>
        {this.rightOfCursorContent.map((item, index) => {
          return <React.Fragment key={`right.${index}`}>{item}</React.Fragment>;
        })}
      </>
    );
  }

  moveCursorTo(direction: 'left' | 'right' | 'end' | 'home') {
    switch (direction) {
      case 'end':
        this.leftOfCursorText = this.leftOfCursorText + this.rightOfCursorText;
        this.rightOfCursorText = '';
        break;

      case 'home':
        this.rightOfCursorText = this.leftOfCursorText + this.rightOfCursorText;
        this.leftOfCursorText = '';
        break;

      case 'left':
        if (this.leftOfCursorText.length) {
          // Add last character on the left, to the right side of the cursor
          this.rightOfCursorText =
            this.leftOfCursorText.charAt(this.leftOfCursorText.length - 1) + this.rightOfCursorText;

          // Remove the last character from the left (it's now on the right side of cursor)
          this.leftOfCursorText = this.leftOfCursorText.substring(
            0,
            this.leftOfCursorText.length - 1
          );
        }
        break;

      case 'right':
        if (this.rightOfCursorText.length) {
          // MOve the first character from the Right side, to the left side of the cursor
          this.leftOfCursorText = this.leftOfCursorText + this.rightOfCursorText.charAt(0);

          // Remove the first character from the Right side of the cursor (now on the left)
          this.rightOfCursorText = this.rightOfCursorText.substring(1);
        }
        break;
    }
  }

  addValue(value: string, replaceSelection: string = '') {
    if (replaceSelection.length && value.length) {
      this.replaceSelection(replaceSelection, value);
    } else {
      this.leftOfCursorText += value;
    }
  }

  deleteChar(replaceSelection: string = '') {
    if (replaceSelection) {
      this.replaceSelection(replaceSelection, '');
    } else if (this.rightOfCursorText) {
      this.rightOfCursorText = this.rightOfCursorText.substring(1);
    }
  }

  backspaceChar(replaceSelection: string = '') {
    if (replaceSelection) {
      this.replaceSelection(replaceSelection, '');
    } else if (this.leftOfCursorText) {
      this.leftOfCursorText = this.leftOfCursorText.substring(0, this.leftOfCursorText.length - 1);
    }
  }

  clear() {
    this.leftOfCursorText = '';
    this.rightOfCursorText = '';

    this.leftOfCursorContent = [];
    this.rightOfCursorContent = [];
  }
}
