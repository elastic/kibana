/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { BannerConfiguration } from '../../common';

interface BannerProps {
  bannerConfig: BannerConfiguration;
}

export const Banner: FC<BannerProps> = ({ bannerConfig }) => {
  const { textContent, textColor, backgroundColor } = bannerConfig;
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor,
        color: textColor,
      }}
    >
      <div>{textContent}</div>
    </div>
  );
};
