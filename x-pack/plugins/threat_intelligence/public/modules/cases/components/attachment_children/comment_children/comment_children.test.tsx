/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  CommentChildren,
  INDICATOR_FEED_NAME_TEST_ID,
  INDICATOR_NAME_TEST_ID,
  INDICATOR_TYPE_TEST_ID,
} from './comment_children';
import { AttachmentMetadata } from '../../../utils';
import { TestProvidersComponent } from '../../../../../common/mocks/test_providers';
import { useIndicatorById } from '../../../hooks';
import { generateMockFileIndicator, Indicator } from '../../../../../../common/types/indicator';

jest.mock('../../../hooks/use_indicator_by_id');

describe('attachment_children initComponent', () => {
  it('should render the basic values', () => {
    const id: string = 'abc123';
    const metadata: AttachmentMetadata = {
      indicatorName: 'indicatorName',
      indicatorFeedName: 'indicatorFeedName',
      indicatorType: 'indicatorType',
    };

    (useIndicatorById as jest.MockedFunction<typeof useIndicatorById>).mockReturnValue({
      indicator: generateMockFileIndicator(),
      isLoading: false,
    });

    const { getByTestId } = render(
      <TestProvidersComponent>
        <CommentChildren id={id} metadata={metadata} />
      </TestProvidersComponent>
    );
    expect(getByTestId(INDICATOR_NAME_TEST_ID)).toHaveTextContent(metadata.indicatorName);
    expect(getByTestId(INDICATOR_FEED_NAME_TEST_ID)).toHaveTextContent(metadata.indicatorFeedName);
    expect(getByTestId(INDICATOR_TYPE_TEST_ID)).toHaveTextContent(metadata.indicatorType);
  });

  it('should show loading', () => {
    const id: string = 'abc123';
    const metadata: AttachmentMetadata = {
      indicatorName: 'indicatorName',
      indicatorFeedName: 'indicatorFeedName',
      indicatorType: 'indicatorType',
    };

    (useIndicatorById as jest.MockedFunction<typeof useIndicatorById>).mockReturnValue({
      indicator: {} as Indicator,
      isLoading: true,
    });

    const component = render(
      <TestProvidersComponent>
        <CommentChildren id={id} metadata={metadata} />
      </TestProvidersComponent>
    );
    expect(component).toMatchSnapshot();
  });
});
