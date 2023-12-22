/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiButton } from '@elastic/eui';
import { getCloudUrl } from '../../navigation/links/util';
import { MANAGE_PROJECTS } from './translations';
import { useKibana } from '../../common/services';

const ManageProjectsButtonComponent = () => {
  const { cloud } = useKibana().services;

  const href = getCloudUrl('projects', cloud);
  return (
    <EuiButton
      aria-label={MANAGE_PROJECTS}
      className="step-paragraph"
      fill
      href={href}
      target="_blank"
    >
      {MANAGE_PROJECTS}
      <EuiIcon type="popout" />
    </EuiButton>
  );
};

export const ManageProjectsButton = React.memo(ManageProjectsButtonComponent);
