/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { Markdown } from '../../../../../src/plugins/kibana_react/public';
import { BannerConfiguration } from '../../common';

import './banner.scss';

interface BannerProps {
  bannerConfig: BannerConfiguration;
}

export const Banner: FC<BannerProps> = ({ bannerConfig }) => {
  const { textContent, textColor, backgroundColor } = bannerConfig;
  return (
    <div
      className="kbnUserBanner__container"
      style={{
        backgroundColor,
        color: textColor,
      }}
    >
      <div data-test-subj="bannerInnerWrapper">
        <Markdown markdown={textContent} />
      </div>
    </div>
  );
};
