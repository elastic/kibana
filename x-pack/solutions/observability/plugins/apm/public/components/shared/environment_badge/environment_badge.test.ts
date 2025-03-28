/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EnvironmentBadge } from '.';
import { render } from '@testing-library/react';
import { expectTextsInDocument, expectTextsNotInDocument } from '../../../utils/test_helpers';

describe('EnvironmentBadge', () => {
  it('shows unset when evironments list is empty', () => {
    const component = render(EnvironmentBadge({ environments: [] }));
    expectTextsInDocument(component, ['Unset']);
  });
  it('shows environment set', () => {
    const component = render(EnvironmentBadge({ environments: ['DEMO'] }));
    expectTextsInDocument(component, ['DEMO']);
    expectTextsNotInDocument(component, ['Unset']);
  });
  it('handles multiple environments', () => {
    const component = render(EnvironmentBadge({ environments: ['DEMO', 'DEV'] }));
    expectTextsInDocument(component, ['2 environments']);
    expectTextsNotInDocument(component, ['DEMO', 'DEV']);
  });
});
