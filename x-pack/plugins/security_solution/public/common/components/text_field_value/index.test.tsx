/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { shallow } from 'enzyme';
import React from 'react';

import { TextFieldValue } from '.';

describe('text_field_value', () => {
  describe('TextFieldValue', () => {
    const longText = [...new Array(20).keys()].map((i) => ` super long text part ${i}`).join(' ');

    it('should render small text correctly, when there is no limit', () => {
      expect(shallow(<TextFieldValue fieldName="field 1" value="value 1" />)).toMatchSnapshot();
    });

    it('should render small text correctly, when there is limit', () => {
      const element = shallow(
        <TextFieldValue fieldName="field 1" value="value 1" maxLength={100} />
      );

      expect(element).toMatchSnapshot();
    });

    it('should render long text correctly, when there is no limit', () => {
      expect(shallow(<TextFieldValue fieldName="field 1" value={longText} />)).toMatchSnapshot();
    });

    it('should render long text correctly, when there is limit', () => {
      const element = shallow(
        <TextFieldValue fieldName="field 1" value={longText} maxLength={100} />
      );

      expect(element).toMatchSnapshot();
    });
  });
});
