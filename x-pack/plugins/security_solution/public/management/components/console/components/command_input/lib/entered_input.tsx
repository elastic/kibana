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

interface InputCharacter {
  value: string;
  renderValue: ReactNode;
  isArgSelector: boolean;
  argName: string;
  argInstance: number; // zero based
}

const createInputCharacter = (overrides: Partial<InputCharacter> = {}): InputCharacter => {
  return {
    value: '',
    renderValue: null,
    isArgSelector: false,
    argName: '',
    argInstance: 0,
    ...overrides,
  };
};

const getInputCharacters = (input: string): InputCharacter[] => {
  return input.split('').map((char) => {
    return createInputCharacter({
      value: char,
      renderValue: char,
    });
  });
};

const toReactJsxFragment = (prefix: string, item: InputCharacter, index: number) => {
  return (
    <React.Fragment key={`${prefix}.${index}.${item.value ?? '$'}`}>
      {item.renderValue}
    </React.Fragment>
  );
};

/**
 * Class that manages the command entered and how that is displayed to the left and right of the cursor
 */
export class EnteredInput {
  private leftOfCursorContent: InputCharacter[];
  private rightOfCursorContent: InputCharacter[];

  constructor(
    leftOfCursorText: string,
    rightOfCursorText: string,
    parsedInput_: MaybeImmutable<ParsedCommandInterface>,
    enteredCommand: undefined | MaybeImmutable<EnteredCommand>
  ) {
    // Cast the `parseInput` to remove `Immutable` type from it
    const parsedInput = parsedInput_ as ParsedCommandInterface;

    this.leftOfCursorContent = getInputCharacters(leftOfCursorText);
    this.rightOfCursorContent = getInputCharacters(rightOfCursorText);

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
        const argInstance = 0;

        // Loop through the input pieces (left and right side of cursor) looking for the Argument name
        for (const { input, items } of inputPieces) {
          // TODO:PT Support multiple occurrences of the argument

          const argNameMatch = `--${argName}`;
          const pos = input.indexOf(argNameMatch);

          if (parsedInput.hasArg(argName) && pos !== -1) {
            const argChrLength = argNameMatch.length;
            const replaceValues: InputCharacter[] = Array.from(
              { length: argChrLength },
              createInputCharacter
            );

            replaceValues[0] = createInputCharacter({
              value: argNameMatch,
              renderValue: <ArgumentSelectorWrapper argName={argName} argDefinition={argDef} />,
              isArgSelector: true,
              argName,
              argInstance,
            });

            items.splice(pos, argChrLength, ...replaceValues);
          }
        }
      }

      // Remove all empty characters (created as a result of inserting any Argument Selector components)
      this.leftOfCursorContent = this.leftOfCursorContent.filter(({ value }) => value.length > 0);
      this.rightOfCursorContent = this.rightOfCursorContent.filter(({ value }) => value.length > 0);
    }
  }

  private replaceSelection(selection: string, newValue: string) {
    const prevFullTextEntered = this.getFullText();
    const leftText = this.getLeftOfCursorText();
    const rightText = this.getRightOfCursorText();

    const newValueContent = newValue ? createInputCharacter({ value: newValue }) : undefined;

    const start = prevFullTextEntered.indexOf(selection);

    let leftSelection = '';
    let rightSelection = '';

    if (start < leftText.length) {
      leftSelection = selection.substring(0, leftText.length - start);

      // If there is still replacement text left, then it
      // needs to be removed from the right side
      if (leftSelection !== selection) {
        rightSelection = selection.substring(leftText.length - 1);
      }
    } else {
      rightSelection = selection;
    }

    // console.log(`
    //
    // full text:      ${prevFullTextEntered}
    //
    // selection:      ${selection}
    // replacement:    ${newValue}
    // current pos:    ${leftText.length}
    //
    // ---------------------------------------------------
    //
    // leftText:       [${leftText}]
    // leftSelection:  [${leftSelection}]
    //
    // rightText:      [${rightText}]
    // rightSelection: [${rightSelection}]
    //
    // `);

    let newCursorIndex = -1;

    if (leftSelection) {
      newCursorIndex = leftText.indexOf(leftSelection);
      this.leftOfCursorContent.splice(newCursorIndex, leftSelection.length);

      if (newValueContent) {
        this.leftOfCursorContent.splice(newCursorIndex, 0, newValueContent);
        // newCursorIndex++;
      }
    }

    if (rightSelection) {
      const spliceStart = rightText.indexOf(rightSelection);

      if (newCursorIndex === -1) {
        newCursorIndex = leftText.length + spliceStart;
      }

      this.rightOfCursorContent.splice(spliceStart, rightSelection.length);

      if (newValueContent && !leftSelection) {
        this.rightOfCursorContent.splice(spliceStart, 0, newValueContent);
        // newCursorIndex++;
      }
    }

    // console.log(`
    //
    // UPDATED LEFT:   [${this.getLeftOfCursorText()}]
    // UPDATED RIGHT:  [${this.getRightOfCursorText()}]
    //
    // UPDATED FULL:   [${this.getFullText()}]
    //
    // NEW POSITION:   ${newCursorIndex}
    //
    // `);
    // console.table(
    //   this.getFullText()
    //     .split('')
    //     .reduce((acc, l, index) => {
    //       acc.push({
    //         letter: l,
    //       });
    //
    //       return acc;
    //     }, [])
    // );

    if (newCursorIndex !== -1) {
      this.moveCursorToIndex(newCursorIndex);
    }
  }

  getLeftOfCursorText(): string {
    return this.leftOfCursorContent.map((item) => item.value).join('');
  }

  getRightOfCursorText(): string {
    return this.rightOfCursorContent.map((item) => item.value).join('');
  }

  getFullText(): string {
    return this.getLeftOfCursorText() + this.getRightOfCursorText();
  }

  getLeftOfCursorRenderingContent(): ReactNode {
    return <>{this.leftOfCursorContent.map(toReactJsxFragment.bind(null, 'left'))}</>;
  }

  getRightOfCursorRenderingContent(): ReactNode {
    return <>{this.rightOfCursorContent.map(toReactJsxFragment.bind(null, 'right'))}</>;
  }

  /**
   * Move the cursor to a specific location. The characters up to and including the `indexPosition`
   * character will be moved to the left of the cursor
   * @param indexPosition zero based
   */
  moveCursorToIndex(indexPosition: number) {
    if (indexPosition === 0 && this.leftOfCursorContent.length) {
      this.moveCursorTo('home');
      return;
    }

    const leftLastIndex = this.leftOfCursorContent.length - 1;
    const rightLastIndex = this.rightOfCursorContent.length - 1;
    const fullLastIndex = this.leftOfCursorContent.length + rightLastIndex;

    if (indexPosition >= fullLastIndex) {
      this.moveCursorTo('end');
      return;
    }

    // move to specific location
    if (indexPosition <= leftLastIndex) {
      this.rightOfCursorContent.unshift(...this.leftOfCursorContent.splice(indexPosition + 1));
    } else {
      const rightSidePosition = indexPosition - leftLastIndex;

      this.leftOfCursorContent.push(...this.rightOfCursorContent.splice(0, rightSidePosition));
    }
  }

  moveCursorTo(direction: 'left' | 'right' | 'end' | 'home') {
    switch (direction) {
      case 'end':
        this.leftOfCursorContent.push(...this.rightOfCursorContent.splice(0));
        break;

      case 'home':
        this.rightOfCursorContent.unshift(...this.leftOfCursorContent.splice(0));
        break;

      case 'left':
        if (this.leftOfCursorContent.length) {
          const itemToMove = this.leftOfCursorContent.pop();

          if (itemToMove) {
            this.rightOfCursorContent.unshift(itemToMove);
          }
        }
        break;

      case 'right':
        if (this.rightOfCursorContent.length) {
          const itemToMove = this.rightOfCursorContent.shift();

          if (itemToMove) {
            this.leftOfCursorContent.push(itemToMove);
          }
        }
        break;
    }
  }

  addValue(value: string, replaceSelection: string = '') {
    if (replaceSelection.length && value.length) {
      this.replaceSelection(replaceSelection, value);
    } else if (value) {
      this.leftOfCursorContent.push(createInputCharacter({ value }));
    }
  }

  deleteChar(replaceSelection: string = '') {
    if (replaceSelection) {
      this.replaceSelection(replaceSelection, '');
    } else {
      this.rightOfCursorContent.shift();
    }
  }

  backspaceChar(replaceSelection: string = '') {
    if (replaceSelection) {
      this.replaceSelection(replaceSelection, '');
    } else {
      this.leftOfCursorContent.pop();
    }
  }

  clear() {
    this.leftOfCursorContent = [];
    this.rightOfCursorContent = [];
  }
}
