/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  allCases,
  allCasesSnake,
  caseWithRegisteredAttachments,
  caseWithRegisteredAttachmentsSnake,
  externalReferenceAttachment,
  externalReferenceAttachmentSnake,
  persistableStateAttachmentSnake,
  persistableStateAttachment,
  caseUserActionsWithRegisteredAttachments,
  caseUserActionsWithRegisteredAttachmentsSnake,
} from '../containers/mock';
import {
  convertAllCasesToCamel,
  convertArrayToCamelCase,
  convertCaseResolveToCamelCase,
  convertCasesToCamelCase,
  convertCaseToCamelCase,
  convertToCamelCase,
  convertAttachmentsToCamelCase,
  convertAttachmentToCamelCase,
  convertUserActionsToCamelCase,
} from './utils';

describe('utils', () => {
  describe('convertArrayToCamelCase', () => {
    it('converts an array of items to camel case correctly', () => {
      const items = [
        { foo_bar: [{ bar_foo: '1' }], test_bar: '2', obj_pros: { is_valid: true } },
        { bar_test: [{ baz_foo: '1' }], test_bar: '2', obj_pros: { is_valid: true } },
      ];
      expect(convertArrayToCamelCase(items)).toEqual([
        { fooBar: [{ barFoo: '1' }], testBar: '2', objPros: { isValid: true } },
        { barTest: [{ bazFoo: '1' }], testBar: '2', objPros: { isValid: true } },
      ]);
    });
  });

  describe('convertToCamelCase', () => {
    it('converts an object to camel case correctly', () => {
      const obj = { bar_test: [{ baz_foo: '1' }], test_bar: '2', obj_pros: { is_valid: true } };

      expect(convertToCamelCase(obj)).toEqual({
        barTest: [{ bazFoo: '1' }],
        testBar: '2',
        objPros: { isValid: true },
      });
    });
  });

  describe('convertAllCasesToCamel', () => {
    it('converts the find response to camel case', () => {
      expect(convertAllCasesToCamel(allCasesSnake)).toEqual(allCases);
    });
  });

  describe('convertCaseToCamelCase', () => {
    it('converts a case to camel case without converting registered attachments', () => {
      expect(convertCaseToCamelCase(caseWithRegisteredAttachmentsSnake)).toEqual(
        caseWithRegisteredAttachments
      );
    });
  });

  describe('convertCasesToCamelCase', () => {
    it('converts multiple cases to camel case without converting registered attachments', () => {
      expect(convertCasesToCamelCase([caseWithRegisteredAttachmentsSnake])).toEqual([
        caseWithRegisteredAttachments,
      ]);
    });
  });

  describe('convertCaseResolveToCamelCase', () => {
    it('converts multiple cases to camel case without converting registered attachments', () => {
      expect(
        convertCaseResolveToCamelCase({
          outcome: 'aliasMatch',
          case: caseWithRegisteredAttachmentsSnake,
        })
      ).toEqual({
        outcome: 'aliasMatch',
        case: caseWithRegisteredAttachments,
      });
    });
  });

  describe('convertAttachmentsToCamelCase', () => {
    it('converts attachments camel case without converting registered attachments', () => {
      expect(convertAttachmentsToCamelCase(caseWithRegisteredAttachmentsSnake.comments)).toEqual(
        caseWithRegisteredAttachments.comments
      );
    });
  });

  describe('convertAttachmentToCamelCase', () => {
    it('converts an external reference attachment to camel case without converting externalReferenceMetadata', () => {
      expect(convertAttachmentToCamelCase(externalReferenceAttachmentSnake)).toEqual(
        externalReferenceAttachment
      );
    });

    it('converts a persistable state attachment to camel case without converting externalReferenceMetadata', () => {
      expect(convertAttachmentToCamelCase(persistableStateAttachmentSnake)).toEqual(
        persistableStateAttachment
      );
    });
  });

  describe('convertUserActionsToCamelCase', () => {
    it('converts attachments camel case without converting registered attachments', () => {
      expect(convertUserActionsToCamelCase(caseUserActionsWithRegisteredAttachmentsSnake)).toEqual(
        caseUserActionsWithRegisteredAttachments
      );
    });
  });
});
