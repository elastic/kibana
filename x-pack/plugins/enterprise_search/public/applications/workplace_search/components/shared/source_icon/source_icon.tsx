/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { camelCase } from 'lodash';

import { images } from '../assets/source_icons';
import { imagesFull } from '../assets/sources_full_bleed';

interface SourceIconProps {
  serviceType: string;
  name: string;
  className?: string;
  wrapped?: boolean;
  fullBleed?: boolean;
}

export const SourceIcon: React.FC<SourceIconProps> = ({
  name,
  serviceType,
  className,
  wrapped,
  fullBleed = false,
}) => {
  const icon = (
    <img
      src={fullBleed ? imagesFull[camelCase(serviceType)] : images[camelCase(serviceType)]}
      alt={name}
      className={className}
    />
  );
  return wrapped ? (
    <div className="user-group-source" title={name}>
      {icon}
    </div>
  ) : (
    <>{icon}</>
  );
};
