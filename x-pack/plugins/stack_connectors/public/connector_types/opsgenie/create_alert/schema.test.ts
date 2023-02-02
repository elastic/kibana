/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeCreateAlert, isPartialCreateAlertSchema } from './schema';
import {
  OpsgenieCreateAlertExample,
  ValidCreateAlertSchema,
} from '../../../../server/connector_types/opsgenie/test_schema';

describe('schema', () => {
  describe('decodeCreateAlert', () => {
    it('throws an error when the message field is not present', () => {
      expect(() => decodeCreateAlert({ alias: '123' })).toThrowErrorMatchingInlineSnapshot(
        `"[message]: expected value of type [string] but got [undefined]"`
      );
    });

    it('throws an error when the message field is only spaces', () => {
      expect(() => decodeCreateAlert({ message: '  ' })).toThrowErrorMatchingInlineSnapshot(
        `"[message]: must be populated with a value other than just whitespace"`
      );
    });

    it('throws an error when the message field is an empty string', () => {
      expect(() => decodeCreateAlert({ message: '' })).toThrowErrorMatchingInlineSnapshot(
        `"[message]: must be populated with a value other than just whitespace"`
      );
    });

    it('throws an error when additional fields are present in the data that are not defined in the schema', () => {
      expect(() =>
        decodeCreateAlert({ invalidField: 'hi', message: 'hi' })
      ).toThrowErrorMatchingInlineSnapshot(`"invalid keys \\"invalidField\\""`);
    });

    it('throws an error when additional fields are present in responders with name field than in the schema', () => {
      expect(() =>
        decodeCreateAlert({
          message: 'hi',
          responders: [{ name: 'sam', type: 'team', invalidField: 'scott' }],
        })
      ).toThrowErrorMatchingInlineSnapshot(`"invalid keys \\"invalidField\\""`);
    });

    it('throws an error when additional fields are present in responders with id field than in the schema', () => {
      expect(() =>
        decodeCreateAlert({
          message: 'hi',
          responders: [{ id: 'id', type: 'team', invalidField: 'scott' }],
        })
      ).toThrowErrorMatchingInlineSnapshot(`"invalid keys \\"invalidField\\""`);
    });

    it('throws an error when additional fields are present in visibleTo with name and type=team', () => {
      expect(() =>
        decodeCreateAlert({
          message: 'hi',
          visibleTo: [{ name: 'sam', type: 'team', invalidField: 'scott' }],
        })
      ).toThrowErrorMatchingInlineSnapshot(`"invalid keys \\"invalidField\\""`);
    });

    it('throws an error when additional fields are present in visibleTo with id and type=team', () => {
      expect(() =>
        decodeCreateAlert({
          message: 'hi',
          visibleTo: [{ id: 'id', type: 'team', invalidField: 'scott' }],
        })
      ).toThrowErrorMatchingInlineSnapshot(`"invalid keys \\"invalidField\\""`);
    });

    it('throws an error when additional fields are present in visibleTo with id and type=user', () => {
      expect(() =>
        decodeCreateAlert({
          message: 'hi',
          visibleTo: [{ id: 'id', type: 'user', invalidField: 'scott' }],
        })
      ).toThrowErrorMatchingInlineSnapshot(`"invalid keys \\"invalidField\\""`);
    });

    it('throws an error when additional fields are present in visibleTo with username and type=user', () => {
      expect(() =>
        decodeCreateAlert({
          message: 'hi',
          visibleTo: [{ username: 'sam', type: 'user', invalidField: 'scott' }],
        })
      ).toThrowErrorMatchingInlineSnapshot(`"invalid keys \\"invalidField\\""`);
    });

    it('throws an error when details is a record of string to number', () => {
      expect(() =>
        decodeCreateAlert({
          message: 'hi',
          details: { id: 1 },
        })
      ).toThrowErrorMatchingInlineSnapshot(`"Invalid value \\"1\\" supplied to \\"details.id\\""`);
    });

    it.each([
      ['ValidCreateAlertSchema', ValidCreateAlertSchema],
      ['OpsgenieCreateAlertExample', OpsgenieCreateAlertExample],
    ])('validates the test object [%s] correctly', (objectName, testObject) => {
      expect(() => decodeCreateAlert(testObject)).not.toThrow();
    });
  });

  describe('isPartialCreateAlertSchema', () => {
    const { message, ...createAlertSchemaWithoutMessage } = ValidCreateAlertSchema;
    const { message: ignoreMessage2, ...opsgenieCreateAlertExampleWithoutMessage } =
      OpsgenieCreateAlertExample;

    it('returns true with an empty object', () => {
      expect(isPartialCreateAlertSchema({})).toBeTruthy();
    });

    it('returns false with undefined', () => {
      expect(isPartialCreateAlertSchema(undefined)).toBeFalsy();
    });

    it('returns true with only alias', () => {
      expect(isPartialCreateAlertSchema({ alias: 'abc' })).toBeTruthy();
    });

    it.each([
      ['ValidCreateAlertSchema', ValidCreateAlertSchema],
      ['OpsgenieCreateAlertExample', OpsgenieCreateAlertExample],
      ['createAlertSchemaWithoutMessage', createAlertSchemaWithoutMessage],
      ['opsgenieCreateAlertExampleWithoutMessage', opsgenieCreateAlertExampleWithoutMessage],
    ])('returns true with the test object [%s]', (objectName, testObject) => {
      expect(isPartialCreateAlertSchema(testObject)).toBeTruthy();
    });

    it('returns false with an additional property', () => {
      expect(isPartialCreateAlertSchema({ anInvalidField: 'a' })).toBeFalsy();
    });
  });
});
