/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import createProjects from '../../images/create_projects.png';
import { CREATE_PROJECT_TITLE } from '../../translations';
import { ContentWrapper } from './content_wrapper';

const CreateProjectImageComponent = () => (
  <ContentWrapper shadow={false}>
    <img src={createProjects} alt={CREATE_PROJECT_TITLE} height="100%" width="100%" />
  </ContentWrapper>
);

export const CreateProjectImage = React.memo(CreateProjectImageComponent);
