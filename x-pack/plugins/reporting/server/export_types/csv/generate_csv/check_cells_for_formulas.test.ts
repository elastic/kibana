/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { checkIfRowsHaveFormulas } from './check_cells_for_formulas';

const formulaValues = ['=', '+', '-', '@'];
const nonRows = [null, undefined, 9, () => {}];

describe(`Check CSV Injected values`, () => {
  it(`returns 'false' when there's no formula values in cells`, () => {
    expect(
      checkIfRowsHaveFormulas(
        {
          _doc: 'foo-bar',
          value: 'cool',
          title: 'nice',
        },
        ['_doc', 'value', 'title']
      )
    ).toBe(false);
  });

  formulaValues.forEach((formula) => {
    it(`returns 'true' when cells start with "${formula}"`, () => {
      expect(
        checkIfRowsHaveFormulas(
          {
            _doc: 'foo-bar',
            value: formula,
            title: 'nice',
          },
          ['_doc', 'value', 'title']
        )
      ).toBe(true);
    });

    it(`returns 'false' when cells start with "${formula}" but aren't selected`, () => {
      expect(
        checkIfRowsHaveFormulas(
          {
            _doc: 'foo-bar',
            value: formula,
            title: 'nice',
          },
          ['_doc', 'title']
        )
      ).toBe(false);
    });
  });

  formulaValues.forEach((formula) => {
    it(`returns 'true' when headers start with "${formula}"`, () => {
      expect(
        checkIfRowsHaveFormulas(
          {
            _doc: 'foo-bar',
            [formula]: 'baz',
            title: 'nice',
          },
          ['_doc', formula, 'title']
        )
      ).toBe(true);
    });

    it(`returns 'false' when headers start with "${formula}" but aren't selected in fields`, () => {
      expect(
        checkIfRowsHaveFormulas(
          {
            _doc: 'foo-bar',
            [formula]: 'baz',
            title: 'nice',
          },
          ['_doc', 'title']
        )
      ).toBe(false);
    });
  });

  nonRows.forEach((nonRow) => {
    it(`returns false when there's "${nonRow}" for rows`, () => {
      expect(
        checkIfRowsHaveFormulas(
          {
            _doc: 'foo-bar',
            // need to assert non-string values still return false
            value: (nonRow as unknown) as string,
            title: 'nice',
          },
          ['_doc', 'value', 'title']
        )
      ).toBe(false);
    });
  });
});
