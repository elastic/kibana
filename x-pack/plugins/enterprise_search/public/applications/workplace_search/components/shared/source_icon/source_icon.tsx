/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { camelCase } from 'lodash';

import { EuiIcon, IconSize } from '@elastic/eui';

import './source_icon.scss';

import { images } from '../assets/source_icons';

interface SourceIconProps {
  serviceType: string;
  name: string;
  className?: string;
  wrapped?: boolean;
  size?: IconSize;
}

export const SourceIcon: React.FC<SourceIconProps> = ({
  name,
  serviceType,
  className,
  wrapped,
  size = 'xxl',
}) => {
  const icon = (
    <EuiIcon type={images[camelCase(serviceType)]} title={name} className={className} size={size} />
  );
  return wrapped ? (
    <div className="wrapped-icon" title={name}>
      {icon}
    </div>
  ) : (
    <>{icon}</>
  );
};
