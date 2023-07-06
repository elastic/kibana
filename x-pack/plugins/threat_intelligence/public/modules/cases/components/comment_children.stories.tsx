/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { of } from 'rxjs';
import { IKibanaSearchResponse } from '@kbn/data-plugin/common';
import { generateMockFileIndicator } from '../../../../common/types/indicator';
import { CommentChildren } from './comment_children';
import { StoryProvidersComponent } from '../../../mocks/story_providers';
import { AttachmentMetadata } from '../utils/attachments';

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
