/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl, renderWithIntl } from 'test_utils/enzyme_helpers';
import { findTestSubject, takeMountedSnapshot } from '@elastic/eui/lib/test';
import { RemoteClusterForm } from './remote_cluster_form';

// Make sure we have deterministic aria IDs.
jest.mock('@elastic/eui/lib/components/form/form_row/make_id', () => () => 'mockId');
jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => ({
  htmlIdGenerator: (prefix = 'staticGenerator') => (suffix = 'staticId') => `${prefix}_${suffix}`,
}));

describe('RemoteClusterForm', () => {
  test(`renders untouched state`, () => {
    const component = renderWithIntl(<RemoteClusterForm save={() => {}} />);
    expect(component).toMatchSnapshot();
  });

  describe('validation', () => {
    test('renders invalid state and a global form error when the user tries to submit an invalid form', () => {
      const component = mountWithIntl(<RemoteClusterForm save={() => {}} />);

      findTestSubject(component, 'remoteClusterFormSaveButton').simulate('click');

      const fieldsSnapshot = [
        'remoteClusterFormNameFormRow',
        'remoteClusterFormSeedNodesFormRow',
        'remoteClusterFormSkipUnavailableFormRow',
        'remoteClusterFormGlobalError',
      ].map(testSubject => {
        const mountedField = findTestSubject(component, testSubject);
        return takeMountedSnapshot(mountedField);
      });

      expect(fieldsSnapshot).toMatchSnapshot();
    });
  });
});
