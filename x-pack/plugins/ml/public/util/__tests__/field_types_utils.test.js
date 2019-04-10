/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES, ML_JOB_FIELD_TYPES } from './../../../common/constants/field_types';
import {
  kbnTypeToMLJobType,
  isKeywordFieldType,
  getFieldTypeAssociatedAriaLabel,
  fieldTypeAssociatedAriaLabels
} from './../field_types_utils';

describe('ML - field type utils', () => {

  describe('kbnTypeToMLJobType', () => {

    it('returns correct ML_JOB_FIELD_TYPES for KBN_FIELD_TYPES', () => {
      const field = {
        type: KBN_FIELD_TYPES.NUMBER,
        aggregatable: true
      };
      expect(kbnTypeToMLJobType(field)).to.be(ML_JOB_FIELD_TYPES.NUMBER);

      field.type = KBN_FIELD_TYPES.DATE;
      expect(kbnTypeToMLJobType(field)).to.be(ML_JOB_FIELD_TYPES.DATE);

      field.type = KBN_FIELD_TYPES.IP;
      expect(kbnTypeToMLJobType(field)).to.be(ML_JOB_FIELD_TYPES.IP);

      field.type = KBN_FIELD_TYPES.BOOLEAN;
      expect(kbnTypeToMLJobType(field)).to.be(ML_JOB_FIELD_TYPES.BOOLEAN);

      field.type = KBN_FIELD_TYPES.GEO_POINT;
      expect(kbnTypeToMLJobType(field)).to.be(ML_JOB_FIELD_TYPES.GEO_POINT);
    });


    it('returns ML_JOB_FIELD_TYPES.KEYWORD for aggregatable KBN_FIELD_TYPES.STRING', () => {
      const field = {
        type: KBN_FIELD_TYPES.STRING,
        aggregatable: true
      };
      expect(kbnTypeToMLJobType(field)).to.be(ML_JOB_FIELD_TYPES.KEYWORD);
    });

    it('returns ML_JOB_FIELD_TYPES.TEXT for non-aggregatable KBN_FIELD_TYPES.STRING', () => {
      const field = {
        type: KBN_FIELD_TYPES.STRING,
        aggregatable: false
      };
      expect(kbnTypeToMLJobType(field)).to.be(ML_JOB_FIELD_TYPES.TEXT);
    });

    it('returns undefined for non-aggregatable "foo"', () => {
      const field = {
        type: 'foo',
        aggregatable: false
      };
      expect(kbnTypeToMLJobType(field)).to.be(undefined);
    });

  });

  describe('getFieldTypeAssociatedAriaLabel: Getting a field type aria label by passing what it is stored in constants', () => {

    describe('Mocked values, should return NULLs', () => {
      it('should returns all ES_FIELD_TYPES labels as null for each correct value', () => {

        const esKeys = Object.keys(ES_FIELD_TYPES);
        const receivedEsLabel = {};
        const testStorage = {};
        esKeys.forEach(constant => {
          receivedEsLabel[constant] = getFieldTypeAssociatedAriaLabel('ES_FIELD_TYPES', ES_FIELD_TYPES[constant]);
          testStorage[constant] = null;
        });

        expect(receivedEsLabel).to.eql(testStorage);
      });
      it('should returns all KBN_FIELD_TYPES labels as null for each correct value', () => {

        const kbnKeys = Object.keys(KBN_FIELD_TYPES);
        const receivedKbnLabels = {};
        const testStorage = {};
        kbnKeys.forEach(constant => {
          receivedKbnLabels[constant] = getFieldTypeAssociatedAriaLabel('KBN_FIELD_TYPES', KBN_FIELD_TYPES[constant]);
          testStorage[constant] = null;
        });

        expect(receivedKbnLabels).to.eql(testStorage);
      });
    });

    it('should returns all ML_JOB_FIELD_TYPES labels exactly as it is for each correct value', () => {

      const mlKeys = Object.keys(ML_JOB_FIELD_TYPES);
      const receivedMlLabels = {};
      const testStorage = fieldTypeAssociatedAriaLabels.ML_JOB_FIELD_TYPES;
      mlKeys.forEach(constant => {
        receivedMlLabels[constant] = getFieldTypeAssociatedAriaLabel('ML_JOB_FIELD_TYPES', ML_JOB_FIELD_TYPES[constant]);
      });

      expect(receivedMlLabels).to.eql(testStorage);
    });
    it('should returns NULL as ML_JOB_FIELD_TYPES does not contain such a keyword', () => {
      expect(
        getFieldTypeAssociatedAriaLabel('ML_JOB_FIELD_TYPES', 'asd')
      ).to.be.null;
    });
  });

  describe('isKeywordFieldType: Testing whether the type is exist or not', () => {

    describe('ES_FIELD_TYPES', () => {
      it('should returns all TRUE values', () => {
        const esKeys = Object.keys(ES_FIELD_TYPES);
        const receivedEsTruths = {};
        const testStorage = {};
        esKeys.forEach(constant => {
          receivedEsTruths[constant] = isKeywordFieldType('ES_FIELD_TYPES', ES_FIELD_TYPES[constant]);
          testStorage[constant] = true;
        });
        expect(receivedEsTruths).to.eql(testStorage);
      });
      it('should returns FALSE value', () => {
        expect(
          isKeywordFieldType('ES_FIELD_TYPES', 'asd')
        ).to.be.false;
      });
      it('should returns NULL value', () => {
        expect(
          isKeywordFieldType('ES_FIELD_TYPES', 'asd', true)
        ).to.be.null;
      });
    });

    describe('KBN_FIELD_TYPES', () => {
      it('should returns all TRUE values', () => {
        const esKeys = Object.keys(KBN_FIELD_TYPES);
        const receivedKbnTruths = {};
        const testStorage = {};
        esKeys.forEach(constant => {
          receivedKbnTruths[constant] = isKeywordFieldType('KBN_FIELD_TYPES', KBN_FIELD_TYPES[constant]);
          testStorage[constant] = true;
        });
        expect(receivedKbnTruths).to.eql(testStorage);
      });
      it('should returns FALSE value', () => {
        expect(
          isKeywordFieldType('KBN_FIELD_TYPES', 'asd')
        ).to.be.false;
      });
      it('should returns NULL value', () => {
        expect(
          isKeywordFieldType('KBN_FIELD_TYPES', 'asd', true)
        ).to.be.null;
      });
    });

    describe('ML_JOB_FIELD_TYPES', () => {
      it('should returns all TRUE values', () => {
        const esKeys = Object.keys(ML_JOB_FIELD_TYPES);
        const receivedMlTruths = {};
        const testStorage = {};
        esKeys.forEach(constant => {
          receivedMlTruths[constant] = isKeywordFieldType('ML_JOB_FIELD_TYPES', ML_JOB_FIELD_TYPES[constant]);
          testStorage[constant] = true;
        });
        expect(receivedMlTruths).to.eql(testStorage);
      });
      it('should returns FALSE value', () => {
        expect(
          isKeywordFieldType('ML_JOB_FIELD_TYPES', 'asd')
        ).to.be.false;
      });
      it('should returns NULL value', () => {
        expect(
          isKeywordFieldType('ML_JOB_FIELD_TYPES', 'asd', true)
        ).to.be.null;
      });
    });
  });
});
