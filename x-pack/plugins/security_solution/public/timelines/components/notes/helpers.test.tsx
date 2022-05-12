/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createNote } from './helpers';

describe('createNote', () => {
  it(`does not trim the note's text content`, () => {
    // A note with two empty todo items.
    // Notice the required trailing whitespace which is required otherwise
    // markdown renderers will not render the list correctly
    const note = '- [ ] \n\n- [ ] ';
    expect(createNote({ newNote: note })).toEqual(
      expect.objectContaining({
        note,
      })
    );
  });
});
