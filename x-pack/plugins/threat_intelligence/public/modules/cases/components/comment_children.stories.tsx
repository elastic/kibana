/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaSearchResponse } from '@kbn/search-types';
import { Story } from '@storybook/react';
import React from 'react';
import { of } from 'rxjs';
import { generateMockFileIndicator } from '../../../../common/types/indicator';
import { StoryProvidersComponent } from '../../../mocks/story_providers';
import { AttachmentMetadata } from '../utils/attachments';
import { CommentChildren } from './comment_children';

export default {
  title: 'CommentChildren',
};

export const Default: Story<void> = () => {
  const id: string = '123';
  const metadata: AttachmentMetadata = {
    indicatorName: 'indicatorName',
    indicatorFeedName: 'indicatorFeedName',
    indicatorType: 'indicatorType',
  };

  const response: IKibanaSearchResponse = {
    isRunning: false,
    isPartial: false,
    rawResponse: {
      hits: {
        hits: [generateMockFileIndicator()],
      },
    },
  };
  const kibana = {
    data: {
      search: {
        search: () => of(response),
      },
    },
  };

  return (
    <StoryProvidersComponent kibana={kibana as any}>
      <CommentChildren id={id} metadata={metadata} />
    </StoryProvidersComponent>
  );
};

export const Loading: Story<void> = () => {
  const id: string = '123';
  const metadata: AttachmentMetadata = {
    indicatorName: 'indicatorName',
    indicatorFeedName: 'indicatorFeedName',
    indicatorType: 'indicatorType',
  };

  const response: IKibanaSearchResponse = {
    isRunning: true,
    isPartial: true,
    rawResponse: {},
  };
  const kibana = {
    data: {
      search: {
        search: () => of(response),
      },
    },
  };

  return (
    <StoryProvidersComponent kibana={kibana as any}>
      <CommentChildren id={id} metadata={metadata} />
    </StoryProvidersComponent>
  );
};
