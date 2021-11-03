/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSpacer } from '@elastic/eui';

import { SpacerSizeTypes } from '../../../types';
import { ViewContentHeader } from '../view_content_header';

interface ContentSectionProps {
  children: React.ReactNode;
  isOrganization?: boolean;
  className?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  headerChildren?: React.ReactNode;
  headerSpacer?: SpacerSizeTypes;
  testSubj?: string;
}

export const ContentSection: React.FC<ContentSectionProps> = ({
  children,
  isOrganization = true,
  className = '',
  title,
  description,
  action,
  headerChildren,
  testSubj,
}) => (
  <div className={className} data-test-subj={testSubj}>
    {title && (
      <>
        <ViewContentHeader
          title={title}
          headingLevel={isOrganization ? 3 : 2}
          titleSize="s"
          description={description}
          action={action}
        />
        {headerChildren}
      </>
    )}
    {children}
    <EuiSpacer />
  </div>
);
