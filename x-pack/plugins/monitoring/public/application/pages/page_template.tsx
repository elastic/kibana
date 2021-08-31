/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useTitle } from '../hooks/use_title';

interface PageTemplateProps {
  title: string;
  children: React.ReactNode;
}

export const PageTemplate = ({ title, children }: PageTemplateProps) => {
  useTitle('', title);

  return <div>{children}</div>;
};
