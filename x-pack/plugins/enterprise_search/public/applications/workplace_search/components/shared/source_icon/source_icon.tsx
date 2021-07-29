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
}

export const SourceIcon: React.FC<SourceIconProps> = ({ name, serviceType, className, size }) => (
  <EuiIcon type={images[camelCase(serviceType)]} title={name} className={className} size={size} />
);
