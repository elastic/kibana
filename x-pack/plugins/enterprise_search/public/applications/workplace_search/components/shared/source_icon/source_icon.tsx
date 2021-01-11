/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { camelCase } from 'lodash';

import { EuiIcon, IconSize } from '@elastic/eui';

import './source_icon.scss';

import { images } from '../assets/source_icons';
import { imagesFull } from '../assets/sources_full_bleed';

interface SourceIconProps {
  serviceType: string;
  name: string;
  className?: string;
  wrapped?: boolean;
  fullBleed?: boolean;
  size?: IconSize;
}

export const SourceIcon: React.FC<SourceIconProps> = ({
  name,
  serviceType,
  className,
  wrapped,
  fullBleed = false,
  size = 'xxl',
}) => {
  const icon = (
    <EuiIcon
      type={fullBleed ? imagesFull[camelCase(serviceType)] : images[camelCase(serviceType)]}
      title={name}
      className={className}
      size={size}
    />
  );
  return wrapped ? (
    <div className="wrapped-icon" title={name}>
      {icon}
    </div>
  ) : (
    <>{icon}</>
  );
};
