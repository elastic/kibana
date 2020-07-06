/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiSpacer, EuiTitle } from '@elastic/eui';

import { TSpacerSize } from '../../../types';

interface IContentSectionProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  headerChildren?: React.ReactNode;
  headerSpacer?: TSpacerSize;
  testSubj?: string;
}

export const ContentSection: React.FC<IContentSectionProps> = ({
  children,
  className = '',
  title,
  description,
  headerChildren,
  headerSpacer,
  testSubj,
}) => (
  <div className={`content-section ${className}`} data-test-subj={testSubj}>
    {title && (
      <>
        <div className="section-header">
          <EuiTitle size="s">
            <h3>{title}</h3>
          </EuiTitle>
          {description && <p className="section-header__description">{description}</p>}
          {headerChildren}
        </div>
        {headerSpacer && <EuiSpacer size={headerSpacer} />}
      </>
    )}
    {children}
  </div>
);
