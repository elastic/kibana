/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedCommandInterface } from './parsed_command_input';
import { parseCommandInput, parsedPidOrEntityIdParameter } from './parsed_command_input';

describe('when using parsed command input utils', () => {
  describe('when using parseCommandInput()', () => {
    const parsedCommandWith = (
      overrides: Partial<Omit<ParsedCommandInterface, 'hasArg' | 'hasArgs'>> = {}
    ): ParsedCommandInterface => {
      return {
        input: '',
        name: 'foo',
        args: {},
        hasArgs: Object.keys(overrides.args || {}).length > 0,
        ...overrides,
      } as ParsedCommandInterface;
    };

    it.each([
      ['foo', 'foo'],
      ['    foo', 'foo'],
      ['    foo     ', 'foo'],
      ['foo     ', 'foo'],
      [' foo-bar  ', 'foo-bar'],
    ])('should identify the command entered: [%s]', (input, expectedCommandName) => {
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand).toEqual(
        parsedCommandWith({
          input,
          name: expectedCommandName,
          args: {},
        })
      );
    });

    it('should parse arguments that the `--` prefix', () => {
      const input = 'foo    --one     --two';
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand).toEqual(
        parsedCommandWith({
          input,
          args: {
            one: [],
            two: [],
          },
        })
      );
    });

    it('should parse arguments that have a single string value', () => {
      const input = 'foo --one value --two=value2';
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand).toEqual(
        parsedCommandWith({
          input,
          args: {
            one: ['value'],
            two: ['value2'],
          },
        })
      );
    });

    it.each([
      ['no quotes', '"mixed quotes\''],
      ['mixed quotes at start/end', '"mixed quotes\''],
      ['escaped the end quote', "'last quote is escaped\\'"],
    ])('should report error for input with argument values that have %s', (_, argValue) => {
      const input = `foo --one ${argValue}`;
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand).toEqual(
        parsedCommandWith({
          input,
          args: expect.anything(),
          errors: ['value for --one contains spaces and must be enclosed in quotes.'],
        })
      );
    });

    it.each([
      ['un-escaped quotes', "'It's 'magic'"],
      ['miss-matched quotes', '"one" two"'],
    ])('should error for input with arguments values that have %s', (_, argValue) => {
      const input = `foo --one ${argValue}`;
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand).toEqual(
        parsedCommandWith({
          input,
          args: expect.anything(),
          errors: [
            expect.stringMatching(
              /value for --one contains quotes \(['"]\) that are not escaped using a backslash \(\\\)/
            ),
          ],
        })
      );
    });

    it.todo('should parse argument shose value have escaped quotes');

    it.each([
      ['single quotes', "'"],
      ['double quotes', '"'],
    ])('should parse arguments whose value is wrapped in %s', (_, quote) => {
      const input = `foo --one ${quote}value for one here${quote} --two=${quote}some more strings for 2${quote}`;
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand).toEqual(
        parsedCommandWith({
          input,
          args: {
            one: ['value for one here'],
            two: ['some more strings for 2'],
          },
        })
      );
    });

    it('should parse arguments that can be used multiple times', () => {
      const input = 'foo --one 1 --one 11 --two=2 --two=22';
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand).toEqual(
        parsedCommandWith({
          input,
          args: {
            one: ['1', '11'],
            two: ['2', '22'],
          },
        })
      );
    });

    it('should parse arguments whose value has `--` in it (must be escaped)', () => {
      const input = 'foo --one "something \\-\\- here" --two="\\-\\-something \\-\\-"';
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand).toEqual(
        parsedCommandWith({
          input,
          args: {
            one: ['something -- here'],
            two: ['--something --'],
          },
        })
      );
    });

    it('should parse arguments whose value has `=` in it', () => {
      const input = 'foo --one "=something \\-\\- here" --two="=something=something else"';
      const parsedCommand = parseCommandInput(input);

      expect(parsedCommand).toEqual(
        parsedCommandWith({
          input,
          args: {
            one: ['=something -- here'],
            two: ['=something=something else'],
          },
        })
      );
    });
  });

  describe('when using parsedPidOrEntityIdParameter()', () => {
    it('should parse a pid as a number and return proper params', () => {
      const parameters = parsedPidOrEntityIdParameter({ pid: ['123'] });
      expect(parameters).toEqual({ pid: 123 });
    });

    it('should parse an entity id correctly and return proper params', () => {
      const parameters = parsedPidOrEntityIdParameter({ entityId: ['123qwe'] });
      expect(parameters).toEqual({ entity_id: '123qwe' });
    });

    it('should return undefined if no params are defined', () => {
      const parameters = parsedPidOrEntityIdParameter({});
      expect(parameters).toEqual(undefined);
    });
  });
});
