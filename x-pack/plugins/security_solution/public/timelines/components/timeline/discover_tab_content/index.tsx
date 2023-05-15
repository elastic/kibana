/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { css } from '@emotion/react';
import { DiscoverMainRoute } from '@kbn/discover-plugin/public/application/main';

const DiscoverTabContent = () => {
  return (
    <div
      css={css`
        width: 100%;
        overflow: scroll;
      `}
    >
      <DiscoverMainRoute isDev={false} />
    </div>
  );
};

// eslint-disable-next-line import/no-default-export
export default DiscoverTabContent;
