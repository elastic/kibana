/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import type { ArgumentSelectorWrapperProps } from '../components/argument_selector_wrapper';
import { ArgumentSelectorWrapper } from '../components/argument_selector_wrapper';
import type { ParsedCommandInterface } from '../../../service/types';
import type { ArgSelectorState, EnteredCommand } from '../../console_state/types';

interface InputCharacter {
  value: string;
  renderValue: ReactNode;
  isArgSelector: boolean;
  argName: string;
  argIndex: number; // zero based
  argState: undefined | ArgSelectorState;
}

const createInputCharacter = (overrides: Partial<InputCharacter> = {}): InputCharacter => {
  return {
    value: '',
    renderValue: null,
    isArgSelector: false,
    argName: '',
    argIndex: 0,
    argState: undefined,
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
  return <span key={`${prefix}.${index}.${item.value ?? '$'}`}>{item.renderValue}</span>;
};

const toInputCharacterDisplayString = (
  includeArgSelectorValues: boolean,
  item: InputCharacter
): string => {
  let response = item.value;

  if (includeArgSelectorValues && item.isArgSelector) {
    response += `="${item.argState?.valueText ?? ''}"`;
  }

  return response;
};

/**
 * Class that manages the command entered and how that is displayed to the left and right of the cursor
 */
export class EnteredInput {
  private leftOfCursorContent: InputCharacter[];
  private rightOfCursorContent: InputCharacter[];
  private canHaveArgValueSelectors: boolean;
  private argState: undefined | EnteredCommand['argState'];

  constructor(
    leftOfCursorText: string,
    rightOfCursorText: string,
    parsedInput: ParsedCommandInterface,
    enteredCommand: undefined | EnteredCommand
  ) {
    this.leftOfCursorContent = getInputCharacters(leftOfCursorText);
    this.rightOfCursorContent = getInputCharacters(rightOfCursorText);

    this.canHaveArgValueSelectors = Boolean(enteredCommand?.argsWithValueSelectors);

    // Determine if any argument value selector should be inserted
    if (parsedInput.hasArgs && enteredCommand && enteredCommand.argsWithValueSelectors) {
      this.argState = enteredCommand.argState;

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
        // If the argument has been used, then replace it with the Arguments Selector
        if (parsedInput.hasArg(argName)) {
          let argIndex = 0;

          // Loop through the input pieces (left and right side of cursor) looking for the Argument name
          for (const { input, items } of inputPieces) {
            const argNameMatch = `--${argName}`;
            let pos = input.indexOf(argNameMatch);

            while (pos > -1) {
              const argChrLength = argNameMatch.length;
              const replaceValues: InputCharacter[] = Array.from(
                { length: argChrLength },
                createInputCharacter
              );
              const argState = enteredCommand.argState[argName]?.at(argIndex);

              replaceValues[0] = createInputCharacter({
                value: argNameMatch,
                renderValue: (
                  <ArgumentSelectorWrapper
                    argName={argName}
                    argIndex={argIndex}
                    argDefinition={argDef as ArgumentSelectorWrapperProps['argDefinition']}
                  />
                ),
                isArgSelector: true,
                argName,
                argIndex: argIndex++,
                argState,
              });

              items.splice(pos, argChrLength, ...replaceValues);

              pos = input.indexOf(argNameMatch, pos + argChrLength);
            }
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
    const newValueContent = newValue ? createInputCharacter({ value: newValue }) : undefined;
    let start = prevFullTextEntered.indexOf(selection);

    const fullContent = [...this.leftOfCursorContent, ...this.rightOfCursorContent];

    // Adjust the `start` to account for arguments that have value selectors.
    // These arguments, are stored in the `fullContent` array as one single array item instead of
    // one per-character. The adjustment needs to be done only if the argument appears to the left
    // of the selection
    if (this.canHaveArgValueSelectors) {
      fullContent.forEach((inputCharacter, index) => {
        if (inputCharacter.isArgSelector && index < start) {
          start = start - (inputCharacter.value.length - 1);
        }
      });
    }

    const removedChars = fullContent.splice(start, selection.length);

    if (newValueContent) {
      fullContent.splice(start, 0, newValueContent);
      start++;
    }

    this.leftOfCursorContent = fullContent.splice(0, start);
    this.rightOfCursorContent = fullContent;
    this.removeArgState(removedChars);
  }

  private removeArgState(argStateList: InputCharacter[]) {
    if (this.argState) {
      let argStateWasAdjusted = false;
      const newArgState = { ...this.argState };

      for (const { argName, argIndex, isArgSelector } of argStateList) {
        if (isArgSelector && newArgState[argName]?.at(argIndex)) {
          newArgState[argName] = newArgState[argName].filter((_, index) => {
            return index !== argIndex;
          });
          argStateWasAdjusted = true;
        }
      }

      if (argStateWasAdjusted) {
        this.argState = newArgState;
      }
    }
  }

  getLeftOfCursorText(includeArgSelectorValues: boolean = false): string {
    return this.leftOfCursorContent
      .map(toInputCharacterDisplayString.bind(null, includeArgSelectorValues))
      .join('');
  }

  getRightOfCursorText(includeArgSelectorValues: boolean = false): string {
    return this.rightOfCursorContent
      .map(toInputCharacterDisplayString.bind(null, includeArgSelectorValues))
      .join('');
  }

  getFullText(includeArgSelectorValues: boolean = false): string {
    return (
      this.getLeftOfCursorText(includeArgSelectorValues) +
      this.getRightOfCursorText(includeArgSelectorValues)
    );
  }

  getLeftOfCursorRenderingContent(): ReactNode {
    return <>{this.leftOfCursorContent.map(toReactJsxFragment.bind(null, 'left'))}</>;
  }

  getRightOfCursorRenderingContent(): ReactNode {
    return <>{this.rightOfCursorContent.map(toReactJsxFragment.bind(null, 'right'))}</>;
  }

  getArgState(): undefined | EnteredCommand['argState'] {
    return this.argState;
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
      const removedChar = this.rightOfCursorContent.shift();

      if (removedChar?.isArgSelector) {
        this.removeArgState([removedChar]);
      }
    }
  }

  backspaceChar(replaceSelection: string = '') {
    if (replaceSelection) {
      this.replaceSelection(replaceSelection, '');
    } else {
      const removedChar = this.leftOfCursorContent.pop();

      if (removedChar?.isArgSelector) {
        this.removeArgState([removedChar]);
      }
    }
  }

  clear() {
    this.leftOfCursorContent = [];
    this.rightOfCursorContent = [];
    this.argState = undefined;
  }
}
