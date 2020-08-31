/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { ThemeProvider } from 'styled-components';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';

import { NoteCard } from '.';

describe('NoteCard', () => {
  const created = new Date();
  const rawNote = 'noteworthy';
  const user = 'elastic';
  const theme = () => ({ eui: euiDarkVars, darkMode: true });

  test('it renders a note card header', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <NoteCard created={created} rawNote={rawNote} user={user} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="note-card-header"]').exists()).toEqual(true);
  });

  test('it renders a note card body', () => {
    const wrapper = mountWithIntl(
      <ThemeProvider theme={theme}>
        <NoteCard created={created} rawNote={rawNote} user={user} />
      </ThemeProvider>
    );

    expect(wrapper.find('[data-test-subj="note-card-body"]').exists()).toEqual(true);
  });
});
