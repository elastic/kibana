/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Story } from '@storybook/react';
import { VersionsPicker } from './versions_picker';
import { SelectedVersions } from './constants';

export default {
  component: VersionsPicker,
  title: 'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/VersionsPicker',
  argTypes: {
    hasBaseVersion: {
      control: 'boolean',
      description: 'Indicates whether the base version of a field is available',
      defaultValue: true,
    },
  },
};

const Template: Story<{ hasBaseVersion: boolean }> = (args) => {
  const [selectedVersions, setSelectedVersions] = useState<SelectedVersions>(
    SelectedVersions.CurrentFinal
  );

  return (
    <VersionsPicker
      hasBaseVersion={args.hasBaseVersion}
      selectedVersions={selectedVersions}
      onChange={setSelectedVersions}
    />
  );
};

export const Default = Template.bind({});
Default.args = {
  hasBaseVersion: true,
};

export const NoBaseVersion = Template.bind({});
NoBaseVersion.args = {
  hasBaseVersion: false,
};
