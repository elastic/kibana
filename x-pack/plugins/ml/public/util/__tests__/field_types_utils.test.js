/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { KBN_FIELD_TYPES, ML_JOB_FIELD_TYPES } from './../../../common/constants/field_types';
import {
  kbnTypeToMLJobType,
  getMLJobTypeAriaLabel,
  mlJobTypeAriaLabels
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

  describe('getMLJobTypeAriaLabel: Getting a field type aria label by passing what it is stored in constants', () => {
    it('should returns all ML_JOB_FIELD_TYPES labels exactly as it is for each correct value', () => {

      const mlKeys = Object.keys(ML_JOB_FIELD_TYPES);
      const receivedMlLabels = {};
      const testStorage = mlJobTypeAriaLabels;
      mlKeys.forEach(constant => {
        receivedMlLabels[constant] = getMLJobTypeAriaLabel(ML_JOB_FIELD_TYPES[constant]);
      });

      expect(receivedMlLabels).to.eql(testStorage);
    });
    it('should returns NULL as ML_JOB_FIELD_TYPES does not contain such a keyword', () => {
      expect(
        getMLJobTypeAriaLabel('ML_JOB_FIELD_TYPES', 'asd')
      ).to.be.null;
    });
  });
});
