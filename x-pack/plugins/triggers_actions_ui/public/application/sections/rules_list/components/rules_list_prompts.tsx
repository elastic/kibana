/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageTemplate } from '@elastic/eui';
import { EmptyPrompt } from '../../../components/prompts/empty_prompt';
import { CenterJustifiedSpinner } from '../../../components/center_justified_spinner';
import { NoPermissionPrompt } from '../../../components/prompts/no_permission_prompt';

interface RulesListPromptsProps {
  showPrompt: boolean;
  showCreateRule: boolean;
  showSpinner: boolean;
  authorizedToCreateRules: boolean;
  onCreateRulesClick: () => void;
}

export const RulesListPrompts = (props: RulesListPromptsProps) => {
  const { showPrompt, authorizedToCreateRules, showSpinner, showCreateRule, onCreateRulesClick } =
    props;

  if (showPrompt) {
    if (authorizedToCreateRules) {
      return (
        <EmptyPrompt showCreateRule={showCreateRule} onCreateRulesClick={onCreateRulesClick} />
      );
    } else {
      return <NoPermissionPrompt />;
    }
  }

  if (showSpinner) {
    return (
      <EuiPageTemplate.Section grow={false} paddingSize="none">
        <CenterJustifiedSpinner />
      </EuiPageTemplate.Section>
    );
  }

  return null;
};
