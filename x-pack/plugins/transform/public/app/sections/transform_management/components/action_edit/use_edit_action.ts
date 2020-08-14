/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';

import { TransformPivotConfig } from '../../../../common';

export const useEditAction = () => {
  const [config, setConfig] = useState<TransformPivotConfig>();
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const closeFlyout = () => setIsFlyoutVisible(false);
  const showFlyout = (newConfig: TransformPivotConfig) => {
    setConfig(newConfig);
    setIsFlyoutVisible(true);
  };

  return {
    config,
    closeFlyout,
    isFlyoutVisible,
    showFlyout,
  };
};
