/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { alertCommentWithIndices, basicAttachment, basicCase } from '../../../containers/mock';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';
import type { Case } from '../../../../common';
import { CaseViewFiles } from './case_view_files';
import { useGetCaseFiles } from '../../../containers/use_get_case_files';

jest.mock('../../../containers/use_get_case_files');

const useGetCaseFilesMock = useGetCaseFiles as jest.Mock;

const caseData: Case = {
  ...basicCase,
  comments: [...basicCase.comments, alertCommentWithIndices],
};

describe('Case View Page files tab', () => {
  let appMockRender: AppMockRenderer;
  useGetCaseFilesMock.mockReturnValue({
    data: {
      pageOfItems: [basicAttachment],
      availableTypes: [basicAttachment.mimeType],
      totalItemCount: 1,
    },
    isLoading: false,
  });

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the utility bar for the attachments table', async () => {
    const result = appMockRender.render(<CaseViewFiles caseData={caseData} />);

    expect(await result.findByTestId('case-detail-upload-file')).toBeInTheDocument();
    expect(await result.findByTestId('case-detail-search-file')).toBeInTheDocument();
    expect(await result.findByTestId('case-detail-select-file-type')).toBeInTheDocument();
  });

  it('should render the attachments table', async () => {
    const result = appMockRender.render(<CaseViewFiles caseData={caseData} />);

    expect(await result.findByTestId('attachments-table')).toBeInTheDocument();
  });

  it('should disable search and filter if there are no attachments', async () => {
    useGetCaseFilesMock.mockReturnValue({
      data: {
        pageOfItems: [],
        availableTypes: [],
        totalItemCount: 0,
      },
      isLoading: false,
    });

    const result = appMockRender.render(<CaseViewFiles caseData={caseData} />);

    expect(await result.findByTestId('case-detail-search-file')).toHaveAttribute('disabled');
    expect(await result.findByTestId('case-detail-select-file-type')).toHaveAttribute('disabled');
  });
});
