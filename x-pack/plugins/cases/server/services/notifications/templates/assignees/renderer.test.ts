/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockCases } from '../../../../mocks';
import { getByText } from '@testing-library/react';
import { assigneesTemplateRenderer } from './renderer';
import type { CaseSavedObjectTransformed } from '../../../../common/types/case';

async function getHTMLNode(caseSO: CaseSavedObjectTransformed, mockCaseUrl: string | null) {
  const div = document.createElement('div');
  // eslint-disable-next-line no-unsanitized/property
  div.innerHTML = await assigneesTemplateRenderer(caseSO, mockCaseUrl);

  return div;
}

describe('Assignees renderer', () => {
  const caseSO = mockCases[0];
  const mockCaseUrl = 'https://example.com/app/security/cases/mock-id-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders case data correctly', async () => {
    const container = await getHTMLNode(caseSO, mockCaseUrl);

    expect(container.querySelector('h1')).toHaveTextContent(caseSO.attributes.title);
    expect(getByText(container, caseSO.attributes.description)).toBeTruthy();
    expect(getByText(container, caseSO.attributes.status)).toBeTruthy();
    expect(getByText(container, caseSO.attributes.severity)).toBeTruthy();
    expect(container.querySelectorAll('.tags')).toHaveLength(caseSO.attributes.tags.length);
    expect(container.querySelector('.btn')).toHaveTextContent('View Elastic Case');
  });
});
