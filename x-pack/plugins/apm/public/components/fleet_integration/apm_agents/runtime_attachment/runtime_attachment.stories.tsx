/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React from 'react';
import { RuntimeAttachment } from '.';
import { JavaRuntimeAttachment } from './supported_agents/java_runtime_attachment';

const stories: Meta<{}> = {
  title: 'fleet/Runtime agent attachment',
  component: RuntimeAttachment,
  decorators: [
    (StoryComponent) => {
      return (
        <div style={{ width: 700 }}>
          <StoryComponent />
        </div>
      );
    },
  ],
};
export default stories;

export const RuntimeAttachmentExample: Story = () => {
  return (
    <RuntimeAttachment
      operations={['Include', 'Exclude']}
      types={['main', 'pid']}
      onChange={() => {}}
      toggleDescription="Attach the Java agent to running and starting Java applications."
      discoveryRulesDescription="For every running JVM, the discovery rules are evaluated in the order they are provided. The first matching rule determines the outcome. Learn more in the docs"
      showUnsavedWarning={true}
    />
  );
};
RuntimeAttachmentExample.storyName = 'RuntimeAttachment';

export const JavaRuntimeAttachmentExample: Story = () => {
  return <JavaRuntimeAttachment onChange={() => {}} />;
};
JavaRuntimeAttachmentExample.storyName = 'JavaRuntimeAttachment';
