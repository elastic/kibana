/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Story } from '@storybook/react';
import { StoryProvidersComponent } from '../../../../../common/mocks/story_providers';
import { CasesFlyoutJson } from './json';
import { AttachmentMetadata } from '../../../utils';

export default {
  title: 'CasesFlyoutJson',
};

export const Default: Story<void> = () => {
  const metadata: AttachmentMetadata = {
    indicatorName: 'indicatorName',
    indicatorFeedName: 'indicatorFeedName',
    indicatorType: 'indicatorType',
    indicatorFirstSeen: 'indicatorFirstSeen',
  };
  const rawDocument: Record<string, unknown> = {
    prop1: 'prop1',
    prop2: 'prop2',
  };

  return (
    <StoryProvidersComponent>
      <CasesFlyoutJson metadata={metadata} rawDocument={rawDocument} />
    </StoryProvidersComponent>
  );
};

export const EmptyRawDocument: Story<void> = () => {
  const metadata: AttachmentMetadata = {
    indicatorName: 'indicatorName',
    indicatorFeedName: 'indicatorFeedName',
    indicatorType: 'indicatorType',
    indicatorFirstSeen: 'indicatorFirstSeen',
  };
  const rawDocument = null as unknown as Record<string, unknown>;

  return (
    <StoryProvidersComponent>
      <CasesFlyoutJson metadata={metadata} rawDocument={rawDocument} />
    </StoryProvidersComponent>
  );
};
