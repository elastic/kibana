/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import { mockCases } from '../../../mocks';
import { getEmailBodyContent, getStatusColor, getSeverityColor } from './notify_user_content';
import {
  commonEmailMock,
  withoutCaseUrlEmailMock,
  multiTagsEmailMock,
  withoutTagsEmailMock,
} from '../mock';
import { CaseStatuses, CaseSeverity } from '../../../../common/api';

describe('NotifyUserContent', () => {
  const caseSO = mockCases[0];

  const mockCaseUrl = 'https://example.com/app/security/cases/mock-id-1';

  const defaultStatusColor = getStatusColor(caseSO.attributes.status);

  const defaultSevColor = getSeverityColor(caseSO.attributes.severity);

  const defaultCaseData = {
    description: caseSO.attributes.description,
    status: caseSO.attributes.status,
    statusColor: defaultStatusColor,
    severity: caseSO.attributes.severity,
    severityColor: defaultSevColor,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns correct HTML content', async () => {
    const data = await getEmailBodyContent(caseSO, mockCaseUrl);

    expect(data).toBe(commonEmailMock(mockCaseUrl, defaultCaseData));
  });

  it('returns correct HTML content when description is longer than 300 characters', async () => {
    const longDesc =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
    const data = await getEmailBodyContent(
      { ...caseSO, attributes: { ...caseSO.attributes, description: longDesc } },
      mockCaseUrl
    );

    expect(data).toBe(commonEmailMock(mockCaseUrl, { ...defaultCaseData, description: longDesc }));
  });

  it('returns correct HTML content for in-progress status', async () => {
    const statusColor = getStatusColor(CaseStatuses['in-progress']);
    const data = await getEmailBodyContent(
      { ...caseSO, attributes: { ...caseSO.attributes, status: CaseStatuses['in-progress'] } },
      mockCaseUrl
    );

    expect(data).toBe(
      commonEmailMock(mockCaseUrl, {
        ...defaultCaseData,
        status: CaseStatuses['in-progress'],
        statusColor,
      })
    );
  });

  it('returns correct HTML content for medium severity', async () => {
    const severityColor = getSeverityColor(CaseSeverity.MEDIUM);
    const data = await getEmailBodyContent(
      { ...caseSO, attributes: { ...caseSO.attributes, severity: CaseSeverity.MEDIUM } },
      mockCaseUrl
    );

    expect(data).toBe(
      commonEmailMock(mockCaseUrl, {
        ...defaultCaseData,
        severity: CaseSeverity.MEDIUM,
        severityColor,
      })
    );
  });

  it('returns HTML content without button when caseUrl is null', async () => {
    const data = await getEmailBodyContent(caseSO, null);

    expect(data).toBe(withoutCaseUrlEmailMock);
  });

  it('returns correct HTML content with multiple tags', async () => {
    const data = await getEmailBodyContent(
      { ...caseSO, attributes: { ...caseSO.attributes, tags: ['one', 'two', 'three', 'four'] } },
      mockCaseUrl
    );

    expect(data).toBe(multiTagsEmailMock);
  });

  it('returns correct HTML content when no tags', async () => {
    const data = await getEmailBodyContent(
      { ...caseSO, attributes: { ...caseSO.attributes, tags: [] } },
      mockCaseUrl
    );

    expect(data).toBe(withoutTagsEmailMock);
  });

  it('throws error correctly', async () => {
    jest.spyOn(fs, 'readFile').mockImplementationOnce(() => {
      throw new Error('Something went wrong while reading a file');
    });

    const data = getEmailBodyContent(caseSO, mockCaseUrl);

    expect(data).resolves.toMatchInlineSnapshot('');
  });
});
