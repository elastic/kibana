/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiSpacer } from '@elastic/eui';

import { TSpacerSize } from '../../../types';

import { ViewContentHeader } from '../view_content_header';

import './content_section.scss';

interface ContentSectionProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  headerChildren?: React.ReactNode;
  headerSpacer?: TSpacerSize;
  testSubj?: string;
}

export const ContentSection: React.FC<ContentSectionProps> = ({
  children,
  className = '',
  title,
  description,
  action,
  headerChildren,
  headerSpacer,
  testSubj,
}) => (
  <div className={`${className} content-section`} data-test-subj={testSubj}>
    {title && (
      <>
        <ViewContentHeader title={title} titleSize="s" description={description} action={action} />
        {headerChildren}
        {headerSpacer && <EuiSpacer size={headerSpacer} />}
      </>
    )}
    {children}
  </div>
);
