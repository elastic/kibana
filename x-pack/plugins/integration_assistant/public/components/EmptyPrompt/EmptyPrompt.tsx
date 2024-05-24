/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageTemplate } from '@elastic/eui';
import { GoBackButton } from '../Buttons/GoBackButton';
import RoutePaths from '../../constants/routePaths';

interface EmptyPromptProps {
  title: string;
  description: string;
  goBackPath: RoutePaths;
}

export const EmptyPrompt = ({ title, description, goBackPath }: EmptyPromptProps) => {
  return (
    <EuiPageTemplate.EmptyPrompt
      title={<span>{title}</span>}
      actions={<GoBackButton path={goBackPath} />}
    >
      {description}
    </EuiPageTemplate.EmptyPrompt>
  );
};
