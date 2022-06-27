/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { camelCase } from 'lodash';

import { EuiIcon, IconSize } from '@elastic/eui';

import { images } from '../assets/source_icons';

interface SourceIconProps {
  serviceType: string;
  name: string;
  className?: string;
  size?: IconSize;
  iconAsBase64?: string;
}

export const SourceIcon: React.FC<SourceIconProps> = ({
  name,
  serviceType,
  className,
  size,
  iconAsBase64,
}) => (
  <EuiIcon
    type={iconAsBase64 ? `data:image/png;base64,${iconAsBase64}` : images[camelCase(serviceType)]}
    title={`${name} logo`}
    className={className}
    size={size}
  />
);
