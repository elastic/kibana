/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEncryptedFieldNotifyLabel } from './get_encrypted_field_notify_label';

describe('getEncryptedFieldNotifyLabel', () => {
  test('renders proper notify label when isCreate equals true', () => {
    const jsxObject = getEncryptedFieldNotifyLabel(true, 2, false, 'test');

    expect(
      jsxObject.props.children.filter(
        (child: any) => child.props['data-test-subj'] === 'rememberValuesMessage'
      ).length
    ).toBeGreaterThan(0);
    expect(
      jsxObject.props.children.filter(
        (child: any) => child.props['data-test-subj'] === 'missingSecretsMessage'
      ).length
    ).toBe(0);
    expect(
      jsxObject.props.children.filter(
        (child: any) => child.props['data-test-subj'] === 'reenterValuesMessage'
      ).length
    ).toBe(0);
  });

  test('renders proper notify label when secrets is missing', () => {
    const jsxObject = getEncryptedFieldNotifyLabel(false, 2, true, 'test');

    expect(
      jsxObject.props.children.filter(
        (child: any) => child.props['data-test-subj'] === 'rememberValuesMessage'
      ).length
    ).toBe(0);
    expect(
      jsxObject.props.children.filter(
        (child: any) => child.props['data-test-subj'] === 'missingSecretsMessage'
      ).length
    ).toBeGreaterThan(0);
    expect(
      jsxObject.props.children.filter(
        (child: any) => child.props['data-test-subj'] === 'reenterValuesMessage'
      ).length
    ).toBe(0);
  });

  test('renders proper notify label when isCreate false (edit mode) and isMissingSecrets false', () => {
    const jsxObject = getEncryptedFieldNotifyLabel(false, 2, false, 'test');

    expect(
      jsxObject.props.children.filter(
        (child: any) => child.props['data-test-subj'] === 'rememberValuesMessage'
      ).length
    ).toBe(0);
    expect(
      jsxObject.props.children.filter(
        (child: any) => child.props['data-test-subj'] === 'missingSecretsMessage'
      ).length
    ).toBe(0);
    expect(
      jsxObject.props.children.filter(
        (child: any) => child.props['data-test-subj'] === 'reenterValuesMessage'
      ).length
    ).toBeGreaterThan(0);
  });
});
