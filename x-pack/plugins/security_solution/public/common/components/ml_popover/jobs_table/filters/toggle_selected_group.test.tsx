/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toggleSelectedGroup } from './toggle_selected_group';

describe('#toggleSelectedGroup', () => {
  let setSelectedGroups: jest.Mock;
  beforeEach(() => {
    setSelectedGroups = jest.fn();
  });

  test('removes only job', () => {
    toggleSelectedGroup('deadbeat', ['deadbeat'], setSelectedGroups);
    expect(setSelectedGroups.mock.calls[0][0]).toEqual([]);
  });

  test('removes first job', () => {
    toggleSelectedGroup('siem', ['siem', 'frankbeat', 'auditbeat'], setSelectedGroups);
    expect(setSelectedGroups.mock.calls[0][0]).toEqual(['frankbeat', 'auditbeat']);
  });

  test('removes middle job', () => {
    toggleSelectedGroup('frankbeat', ['siem', 'frankbeat', 'auditbeat'], setSelectedGroups);
    expect(setSelectedGroups.mock.calls[0][0]).toEqual(['siem', 'auditbeat']);
  });

  test('removes last job', () => {
    toggleSelectedGroup('auditbeat', ['siem', 'frankbeat', 'auditbeat'], setSelectedGroups);
    expect(setSelectedGroups.mock.calls[0][0]).toEqual(['siem', 'frankbeat']);
  });

  test('adds job if element does not exist', () => {
    toggleSelectedGroup('deadbeat', ['siem', 'frankbeat', 'auditbeat'], setSelectedGroups);
    expect(setSelectedGroups.mock.calls[0][0]).toEqual([
      'siem',
      'frankbeat',
      'auditbeat',
      'deadbeat',
    ]);
  });
});
