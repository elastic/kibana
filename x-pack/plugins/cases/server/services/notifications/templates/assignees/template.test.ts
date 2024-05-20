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

describe('Assignees template', () => {
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

  it('renders long description, status, severity  correctly', async () => {
    const longDesc =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';

    const container = await getHTMLNode(
      {
        ...caseSO,
        attributes: {
          ...caseSO.attributes,
          description: longDesc,
          status: caseSO.attributes.status,
          severity: caseSO.attributes.severity,
        },
      },
      mockCaseUrl
    );

    expect(getByText(container, `${longDesc.slice(0, 300)}...`)).toBeTruthy();
    expect(getByText(container, caseSO.attributes.status)).toBeTruthy();
    expect(getByText(container, caseSO.attributes.severity)).toBeTruthy();
  });

  it('renders different multiple tags  correctly', async () => {
    const container = await getHTMLNode(
      { ...caseSO, attributes: { ...caseSO.attributes, tags: ['one', 'two', 'three', 'four'] } },
      mockCaseUrl
    );

    expect(container.querySelectorAll('.tags')).toHaveLength(3);
  });

  it('renders correctly when case url is null', async () => {
    const container = await getHTMLNode(caseSO, null);

    expect(container.querySelector('.btn')).not.toBeTruthy();
  });

  it('renders current year correctly', async () => {
    const currentYear = new Date().getUTCFullYear();
    const footerText = `© ${currentYear} Elasticsearch B.V. All Rights Reserved.`;

    const container = await getHTMLNode(caseSO, mockCaseUrl);

    expect(getByText(container, footerText, { exact: false })).toBeTruthy();
  });
});
