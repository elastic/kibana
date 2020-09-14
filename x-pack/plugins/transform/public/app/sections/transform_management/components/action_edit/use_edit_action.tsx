/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useMemo, useState } from 'react';

import { TransformListAction, TransformListRow, TransformPivotConfig } from '../../../../common';
import { AuthorizationContext } from '../../../../lib/authorization';

import { editActionNameText, EditActionName } from './edit_action_name';

export const useEditAction = (forceDisable: boolean) => {
  const { canCreateTransform } = useContext(AuthorizationContext).capabilities;

  const [config, setConfig] = useState<TransformPivotConfig>();
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const closeFlyout = () => setIsFlyoutVisible(false);
  const showFlyout = (newConfig: TransformPivotConfig) => {
    setConfig(newConfig);
    setIsFlyoutVisible(true);
  };

  const action: TransformListAction = useMemo(
    () => ({
      name: () => <EditActionName />,
      enabled: () => canCreateTransform || !forceDisable,
      description: editActionNameText,
      icon: 'pencil',
      type: 'icon',
      onClick: (item: TransformListRow) => showFlyout(item.config),
      'data-test-subj': 'transformActionEdit',
    }),
    [canCreateTransform, forceDisable]
  );

  return {
    action,
    config,
    closeFlyout,
    isFlyoutVisible,
    showFlyout,
  };
};
