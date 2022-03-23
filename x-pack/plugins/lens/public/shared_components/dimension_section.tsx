/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiTitle } from '@elastic/eui';
import React from 'react';
import './dimension_section.scss';

export const DimensionEditorSection = ({
  children,
  title,
}: {
  title?: string;
  children?: React.ReactNode | React.ReactNode[];
}) => {
  return (
    <div className="lnsDimensionEditorSection">
      <div className="lnsDimensionEditorSection__border" />
      {title && (
        <EuiTitle size="xxs" className="lnsXyConfigHeading">
          <h3>{title}</h3>
        </EuiTitle>
      )}
      {children}
    </div>
  );
};
