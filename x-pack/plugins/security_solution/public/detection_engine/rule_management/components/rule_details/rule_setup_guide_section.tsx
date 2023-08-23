/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { MarkdownRenderer } from '../../../../common/components/markdown_editor';

interface RuleSetupGuideSectionProps {
  setup: string;
}

export const RuleSetupGuideSection = ({ setup }: RuleSetupGuideSectionProps) => {
  return (
    <div>
      <MarkdownRenderer>{setup}</MarkdownRenderer>
    </div>
  );
};
