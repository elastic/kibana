/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import classNames from 'classnames';
import './dimension_section.scss';

export const DimensionEditorSection = ({
  children,
  hasBorder,
}: {
  children?: React.ReactNode | React.ReactNode[];
  hasBorder?: boolean;
}) => {
  return (
    <div
      className={classNames(
        { 'lnsDimensionEditorSection--hasBorder': hasBorder },
        'lnsDimensionEditorSection'
      )}
    >
      {children}
    </div>
  );
};
