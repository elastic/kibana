/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { getRuleTagFilterLazy } from '../../../common/get_rule_tag_filter';

export const RuleTagFilterSandbox = () => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  return (
    <div style={{ flex: 1 }}>
      {getRuleTagFilterLazy({
        tags: ['tag1', 'tag2', 'tag3', 'tag4'],
        selectedTags,
        onChange: setSelectedTags,
      })}
      <EuiSpacer />
      <div>selected tags: {JSON.stringify(selectedTags)}</div>
    </div>
  );
};
