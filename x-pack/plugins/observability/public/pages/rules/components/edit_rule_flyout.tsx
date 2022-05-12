/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useKibana } from '../../../utils/kibana_react';
import { EditFlyoutProps } from '../types';

export function EditRuleFlyout({ currentRule, onSave }: EditFlyoutProps) {
  const { triggersActionsUi } = useKibana().services;
  const [editFlyoutVisible, setEditFlyoutVisibility] = useState<boolean>(false);

  useEffect(() => {
    setEditFlyoutVisibility(true);
  }, [currentRule]);
  const EditAlertFlyout = useMemo(
    () =>
      triggersActionsUi.getEditAlertFlyout({
        initialRule: currentRule,
        onClose: () => {
          setEditFlyoutVisibility(false);
        },
        onSave,
      }),
    [currentRule, setEditFlyoutVisibility, triggersActionsUi, onSave]
  );
  return <>{editFlyoutVisible && EditAlertFlyout}</>;
}
