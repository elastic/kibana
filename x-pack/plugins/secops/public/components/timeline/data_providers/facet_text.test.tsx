/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import * as React from 'react';
import { FacetText } from './facet_text';

describe('FacetText', () => {
  describe('rendering', () => {
    test('it renders the contents of the text prop', () => {
      const text = '123';

      const wrapper = shallow(<FacetText text={text} />);

      expect(
        wrapper
          .dive()
          .find('[data-test-subj="facetText"]')
          .text()
      ).toEqual(text);
    });
  });
});
