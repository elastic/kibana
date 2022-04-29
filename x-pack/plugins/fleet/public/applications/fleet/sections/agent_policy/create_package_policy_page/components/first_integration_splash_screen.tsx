/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { WithHeaderLayout } from '../../../../layouts';

export const AddFirstIntegrationSplashScreen: React.FC = () => {
  const maxWidth = 770;
  return (
    <WithHeaderLayout restrictHeaderWidth={maxWidth}>
      <div>Hello World</div>
    </WithHeaderLayout>
  );
};
