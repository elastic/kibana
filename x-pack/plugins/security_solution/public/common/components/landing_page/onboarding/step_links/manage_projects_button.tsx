/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon } from '@elastic/eui';
import React, { useCallback } from 'react';
import { LinkButton } from '../../../links';
import { useStepContext } from '../context/step_context';
import { useProjectsUrl } from '../hooks/use_projects_url';
import { CreateProjectSteps } from '../types';
import { MANAGE_PROJECTS } from './translations';
import { ManageProjectsStepLinkId } from './types';

const ManageProjectsButtonComponent = () => {
  const projectsUrl = useProjectsUrl();
  const { onStepLinkClicked } = useStepContext();
  const onClick = useCallback(() => {
    onStepLinkClicked({
      originStepId: CreateProjectSteps.createFirstProject,
      stepLinkId: ManageProjectsStepLinkId,
    });
  }, [onStepLinkClicked]);

  return projectsUrl ? (
    <LinkButton
      aria-label={MANAGE_PROJECTS}
      className="step-paragraph"
      fill
      href={projectsUrl}
      target="_blank"
      onClick={onClick}
    >
      {MANAGE_PROJECTS}
      <EuiIcon type="popout" />
    </LinkButton>
  ) : null;
};

export const ManageProjectsButton = React.memo(ManageProjectsButtonComponent);
