/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

// Prefer importing entire lodash library, e.g. import { get } from "lodash"
// eslint-disable-next-line no-restricted-imports
import _camelCase from 'lodash/camelCase';

import { images } from '../assets';

interface SourceIconProps {
  serviceType: string;
  name: string;
  className?: string;
  wrapped?: boolean;
}

export const SourceIcon: React.FC<SourceIconProps> = ({
  name,
  serviceType,
  className,
  wrapped,
}) => {
  const icon = <img src={images[_camelCase(serviceType)]} alt={name} className={className} />;
  return wrapped ? (
    <div className="user-group-source" title={name}>
      {icon}
    </div>
  ) : (
    <>{icon}</>
  );
};
