/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EnteredInput } from './entered_input';
import { parseCommandInput } from '../../../service/parsed_command_input';
import type { CommandDefinition } from '../../..';
import { getCommandListMock } from '../../../mocks';
import type { EnteredCommand } from '../../console_state/types';

describe('When using `EnteredInput` class', () => {
  let enteredInput: EnteredInput;
  let commandDefinition: CommandDefinition;

  const createEnteredInput = (
    leftOfCursorText: string = 'cmd1 --comment="hello"',
    rightOfCursorText: string = '',
    commandDef: CommandDefinition | undefined = commandDefinition,
    argValueSelectorState: EnteredCommand['argState'] = {}
  ): EnteredInput => {
    const parsedInput = parseCommandInput(leftOfCursorText + rightOfCursorText);
    const enteredCommand: EnteredCommand | undefined = commandDef
      ? {
          commandDefinition: commandDef,
          argState: argValueSelectorState,
          argsWithValueSelectors: undefined,
        }
      : undefined;

    enteredInput = new EnteredInput(
      leftOfCursorText,
      rightOfCursorText,
      parsedInput,
      enteredCommand
    );

    return enteredInput;
  };

  beforeEach(() => {
    commandDefinition = getCommandListMock().find((def) => def.name === 'cmd1')!;
  });

  it('should clear input when calling `clear()`', () => {
    createEnteredInput('cmd1 --comment="', 'hello"');

    expect(enteredInput.getFullText()).toEqual('cmd1 --comment="hello"');

    enteredInput.clear();

    expect(enteredInput.getFullText()).toEqual('');
  });

  it.each([
    {
      leftInput: 'cmd1 --comment="',
      rightInput: '',
      valueToAdd: 'n',
      leftExpected: 'cmd1 --comment="n',
      rightExpected: '',
    },
    {
      leftInput: 'cmd1 --comment="',
      rightInput: '"',
      valueToAdd: 'n',
      leftExpected: 'cmd1 --comment="n',
      rightExpected: '"',
    },
    {
      leftInput: '',
      rightInput: 'cmd1 --comment=""',
      valueToAdd: 'n',
      leftExpected: 'n',
      rightExpected: 'cmd1 --comment=""',
    },
  ])(
    'Should add [$valueToAdd] to command left=[$leftInput] right=[$rightInput]',
    ({ leftInput, rightInput, valueToAdd, leftExpected, rightExpected }) => {
      createEnteredInput(leftInput, rightInput);
      enteredInput.addValue(valueToAdd);

      expect(enteredInput.getLeftOfCursorText()).toEqual(leftExpected);
      expect(enteredInput.getRightOfCursorText()).toEqual(rightExpected);
    }
  );

  it.each([
    // Cursor at the end

    // Cursor at the start
    {
      leftInput: '',
      rightInput: 'cmd1 --comment="hello"',
      valueToAdd: 'n',
      valueToReplace: 'hello',
      leftExpected: 'cmd1 --comment="n',
      rightExpected: '"',
    },
    // Cursor in the middle with replacement value on the right
    {
      leftInput: 'cmd1 --comment',
      rightInput: '="hello"',
      valueToAdd: 'n',
      valueToReplace: 'hello',
      leftExpected: 'cmd1 --comment="n',
      rightExpected: '"',
    },
    // Cursor in the middle right between the replacement value
    {
      leftInput: 'cmd1 --comment="he',
      rightInput: 'llo"',
      valueToAdd: 'n',
      valueToReplace: 'hello',
      leftExpected: 'cmd1 --comment="n',
      rightExpected: '"',
    },
    // Cursor at the end of the value that will be replaced
    {
      leftInput: 'cmd1 --comment="hello',
      rightInput: '"',
      valueToAdd: 'n',
      valueToReplace: 'hello',
      leftExpected: 'cmd1 --comment="n',
      rightExpected: '"',
    },
    // Cursor at the start of the value that will be replaced
    {
      leftInput: 'cmd1 --comment="',
      rightInput: 'hello"',
      valueToAdd: 'n',
      valueToReplace: 'hello',
      leftExpected: 'cmd1 --comment="n',
      rightExpected: '"',
    },
  ])(
    'Should replace (via `.addValue()`) [$valueToReplace] with [$valueToAdd] on command left=[$leftInput] right=[$rightInput]',
    ({ leftInput, rightInput, valueToAdd, valueToReplace, rightExpected, leftExpected }) => {
      createEnteredInput(leftInput, rightInput);
      enteredInput.addValue(valueToAdd, valueToReplace);

      expect(enteredInput.getLeftOfCursorText()).toEqual(leftExpected);
      expect(enteredInput.getRightOfCursorText()).toEqual(rightExpected);
    }
  );

  it.each([
    {
      leftInput: 'cmd1 --comment="',
      rightInput: 'hello"',
      direction: 'left',
      leftExpected: 'cmd1 --comment=',
      rightExpected: '"hello"',
    },
    {
      leftInput: 'cmd1 --comment="',
      rightInput: 'hello"',
      direction: 'right',
      leftExpected: 'cmd1 --comment="h',
      rightExpected: 'ello"',
    },
    {
      leftInput: 'cmd1 --comment="',
      rightInput: 'hello"',
      direction: 'end',
      leftExpected: 'cmd1 --comment="hello"',
      rightExpected: '',
    },
    {
      leftInput: 'cmd1 --comment="',
      rightInput: 'hello"',
      direction: 'home',
      leftExpected: '',
      rightExpected: 'cmd1 --comment="hello"',
    },
  ])(
    'should move cursor $direction',
    ({ leftInput, rightInput, direction, leftExpected, rightExpected }) => {
      createEnteredInput(leftInput, rightInput);
      enteredInput.moveCursorTo(direction as Parameters<EnteredInput['moveCursorTo']>[0]);

      expect(enteredInput.getLeftOfCursorText()).toEqual(leftExpected);
      expect(enteredInput.getRightOfCursorText()).toEqual(rightExpected);
    }
  );

  it.each([
    {
      leftInput: 'cmd1 --comment="hello"',
      rightInput: '',
      leftExpected: 'cmd1 --comment="hello"',
      rightExpected: '',
    },
    {
      leftInput: '',
      rightInput: 'cmd1 --comment="hello"',
      leftExpected: '',
      rightExpected: 'md1 --comment="hello"',
    },
    {
      leftInput: 'cmd1 --comment="h',
      rightInput: 'ello"',
      leftExpected: 'cmd1 --comment="h',
      rightExpected: 'llo"',
    },
  ])(
    'should remove expected character using `deleteChar()` when command is left=[$leftInput] right=[$rightInput]',
    ({ leftInput, rightInput, leftExpected, rightExpected }) => {
      createEnteredInput(leftInput, rightInput);

      enteredInput.deleteChar();

      expect(enteredInput.getLeftOfCursorText()).toEqual(leftExpected);
      expect(enteredInput.getRightOfCursorText()).toEqual(rightExpected);
    }
  );

  it.each([
    {
      leftInput: 'cmd1 --comment="hello"',
      rightInput: '',
      leftExpected: 'cmd1 --comment="hello',
      rightExpected: '',
    },
    {
      leftInput: '',
      rightInput: 'cmd1 --comment="hello"',
      leftExpected: '',
      rightExpected: 'cmd1 --comment="hello"',
    },
    {
      leftInput: 'cmd1 --comment="h',
      rightInput: 'ello"',
      leftExpected: 'cmd1 --comment="',
      rightExpected: 'ello"',
    },
  ])(
    'should remove expected character using `backspaceChar()` when command is left=[$leftInput] right=[$rightInput]',
    ({ leftInput, rightInput, leftExpected, rightExpected }) => {
      createEnteredInput(leftInput, rightInput);

      enteredInput.backspaceChar();

      expect(enteredInput.getLeftOfCursorText()).toEqual(leftExpected);
      expect(enteredInput.getRightOfCursorText()).toEqual(rightExpected);
    }
  );

  describe.each(['deleteChar', 'backspaceChar'])(
    'and using %s with text selected',
    (methodName) => {
      it.each([
        {
          leftInput: 'cmd1 --comment="hello"',
          rightInput: '',
          valueToReplace: 'hello',
          leftExpected: 'cmd1 --comment="',
          rightExpected: '"',
        },
        // Cursor at the start
        {
          leftInput: '',
          rightInput: 'cmd1 --comment="hello"',
          valueToReplace: 'hello',
          leftExpected: 'cmd1 --comment="',
          rightExpected: '"',
        },
        // Cursor in the middle with replacement value on the right
        {
          leftInput: 'cmd1 --comment',
          rightInput: '="hello"',
          valueToReplace: 'hello',
          leftExpected: 'cmd1 --comment="',
          rightExpected: '"',
        },
        // Cursor in the middle right between the replacement value
        {
          leftInput: 'cmd1 --comment="he',
          rightInput: 'llo"',
          valueToReplace: 'hello',
          leftExpected: 'cmd1 --comment="',
          rightExpected: '"',
        },
        // Cursor at the end of the value that will be replaced
        {
          leftInput: 'cmd1 --comment="hello',
          rightInput: '"',
          valueToReplace: 'hello',
          leftExpected: 'cmd1 --comment="',
          rightExpected: '"',
        },
        // Cursor at the start of the value that will be replaced
        {
          leftInput: 'cmd1 --comment="',
          rightInput: 'hello"',
          valueToReplace: 'hello',
          leftExpected: 'cmd1 --comment="',
          rightExpected: '"',
        },
      ])(
        'Should remove selection [$valueToReplace] (via `.deleteChr()`) from command left=[$leftInput] right=[$rightInput]',
        ({ leftInput, rightInput, valueToReplace, rightExpected, leftExpected }) => {
          createEnteredInput(leftInput, rightInput);

          switch (methodName) {
            case 'deleteChar':
              enteredInput.deleteChar(valueToReplace);
              break;
            case 'backspaceChar':
              enteredInput.backspaceChar(valueToReplace);
              break;
          }

          expect(enteredInput.getLeftOfCursorText()).toEqual(leftExpected);
          expect(enteredInput.getRightOfCursorText()).toEqual(rightExpected);
        }
      );
    }
  );
});
