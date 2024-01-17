/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiButton } from '@elastic/eui';
import { MANAGE_PROJECTS } from './translations';
import { useGetStartedContext } from '../context/get_started_context';

const ManageProjectsButtonComponent = () => {
  const { projectsUrl } = useGetStartedContext();
  return projectsUrl ? (
    <EuiButton
      aria-label={MANAGE_PROJECTS}
      className="step-paragraph"
      fill
      href={projectsUrl}
      target="_blank"
    >
      {MANAGE_PROJECTS}
      <EuiIcon type="popout" />
    </EuiButton>
  ) : null;
};

export const ManageProjectsButton = React.memo(ManageProjectsButtonComponent);
