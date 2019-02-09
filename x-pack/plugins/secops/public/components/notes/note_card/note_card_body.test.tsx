/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import * as React from 'react';

import { NoteCardBody } from './note_card_body';

describe('NoteCardBody', () => {
  const markdownHeaderPrefix = '# '; // translates to an h1 in markdown
  const noteText = 'This is a note';
  const rawNote = `${markdownHeaderPrefix} ${noteText}`;

  test('it renders the text of the note in an h1', () => {
    const wrapper = mount(<NoteCardBody rawNote={rawNote} />);

    expect(
      wrapper
        .find('h1')
        .first()
        .text()
    ).toEqual(noteText);
  });
});
