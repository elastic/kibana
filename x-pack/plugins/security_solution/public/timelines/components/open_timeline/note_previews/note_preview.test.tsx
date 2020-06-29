/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { getEmptyValue } from '../../../../common/components/empty_value';
import { NotePreview } from './note_preview';

import * as i18n from '../translations';

describe('NotePreview', () => {
  const theme = () => ({ eui: euiDarkVars, darkMode: true });

  describe('Avatar', () => {
    test('it renders an avatar with the expected initials when updatedBy is provided', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <NotePreview updatedBy="admin" />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="avatar"]').first().text()).toEqual('a');
    });

    test('it renders an avatar with a "?" when updatedBy is undefined', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <NotePreview />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="avatar"]').first().text()).toEqual('?');
    });

    test('it renders an avatar with a "?" when updatedBy is null', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <NotePreview updatedBy={null} />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="avatar"]').first().text()).toEqual('?');
    });
  });

  describe('UpdatedBy', () => {
    test('it renders the username when updatedBy is provided', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <NotePreview updatedBy="admin" />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="updated-by"]').first().text()).toEqual('admin');
    });

    test('it renders placeholder text when updatedBy is undefined', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <NotePreview />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="updated-by"]').first().text()).toEqual(getEmptyValue());
    });

    test('it renders placeholder text when updatedBy is null', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <NotePreview updatedBy={null} />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="updated-by"]').first().text()).toEqual(getEmptyValue());
    });
  });

  describe('Updated', () => {
    const updated = 1553300753 * 1000;

    test('it is always prefixed by "Posted:"', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <NotePreview updated={updated} />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="posted"]').first().text().startsWith(i18n.POSTED)).toBe(
        true
      );
    });

    test('it renders the relative date when updated is provided', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <NotePreview updated={updated} />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="updated"]').first().exists()).toBe(true);
    });

    test('it does NOT render the relative date when updated is undefined', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <NotePreview />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="updated"]').first().exists()).toBe(false);
    });

    test('it does NOT render the relative date when updated is null', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <NotePreview updated={null} />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="updated"]').first().exists()).toBe(false);
    });

    test('it renders placeholder text when updated is undefined', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <NotePreview />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="posted"]').first().text()).toEqual(
        `Posted: ${getEmptyValue()}`
      );
    });

    test('it renders placeholder text when updated is null', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <NotePreview updated={null} />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="posted"]').first().text()).toEqual(
        `Posted: ${getEmptyValue()}`
      );
    });
  });
});
