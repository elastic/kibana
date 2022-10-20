/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiLink } from '@elastic/eui';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import React from 'react';
import { AgentName } from "../../../../typings/es_schemas/ui/fields/agent";
import { FormattedMessage } from 'react-intl';

interface AgentExplorerDocsLinkProps {
  agentName: AgentName;
  repositoryUrl?: string;
}

export function AgentExplorerDocsLink({
  agentName,
  repositoryUrl
}: AgentExplorerDocsLinkProps) {

  if (!repositoryUrl) {
    return (
      <>
        {NOT_AVAILABLE_LABEL}
      </>
    )
  }

  return (
    <EuiLink
      data-test-subj={`agentExplorerDocsLink_${agentName}`}
      href={repositoryUrl}
      target="_blank"
      external
    >
      <EuiIcon type='logoGithub' size='m' title='github logo' />
      {' '}
      <FormattedMessage
        id="indexPatternFieldEditor.number.documentationLabel"
        defaultMessage="github"
      />
    </EuiLink>
  );
}
