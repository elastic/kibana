/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import * as i18n from '../translations';

import { NoteCardHeader } from './note_card_header';

describe('NoteCardHeader', () => {
  beforeEach(() => {
    moment.tz.setDefault('UTC');
  });
  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  moment.locale('en');

  const date = moment('2019-02-19 06:21:00');

  const user = 'elastic';

  test('it renders an avatar containing the first letter of the username', () => {
    const wrapper = mountWithIntl(<NoteCardHeader created={date.toDate()} user={user} />);

    expect(wrapper.find('[data-test-subj="avatar"]').first().text()).toEqual(user[0]);
  });

  test('it renders the username', () => {
    const wrapper = mountWithIntl(<NoteCardHeader created={date.toDate()} user={user} />);

    expect(wrapper.find('[data-test-subj="user"]').first().text()).toEqual(user);
  });

  test('it renders the expected action', () => {
    const wrapper = mountWithIntl(<NoteCardHeader created={date.toDate()} user={user} />);

    expect(wrapper.find('[data-test-subj="action"]').first().text()).toEqual(i18n.ADDED_A_NOTE);
  });

  test('it renders a humanized date when the note was created', () => {
    const wrapper = mountWithIntl(<NoteCardHeader created={date.toDate()} user={user} />);

    expect(wrapper.exists()).toEqual(true);
  });
});
