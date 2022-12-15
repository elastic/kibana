/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EmptyPrompt } from '../../../components/prompts/empty_prompt';
import { NoPermissionPrompt } from '../../../components/prompts/no_permission_prompt';

interface RulesListPromptsProps {
  showCreateRule: boolean;
  authorizedToCreateRules: boolean;
  onCreateRulesClick: () => void;
}

export const RulesListPrompts = (props: RulesListPromptsProps) => {
  const { authorizedToCreateRules, showCreateRule, onCreateRulesClick } = props;

  if (authorizedToCreateRules) {
    return <EmptyPrompt showCreateRule={showCreateRule} onCreateRulesClick={onCreateRulesClick} />;
  } else {
    return <NoPermissionPrompt />;
  }
};
