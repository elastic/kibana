/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { useBoolean } from '@kbn/react-hooks';
import { useAsyncConfirmation } from '../../rules_table/use_async_confirmation';
import { UpgradeWithConflictsModal } from './upgrade_modal';

interface UseUpgradeWithConflictsModalResult {
  modal: ReactNode;
  confirmConflictsUpgrade: () => Promise<boolean>;
}

export function useUpgradeWithConflictsModal(): UseUpgradeWithConflictsModalResult {
  const [isVisible, { on: showModal, off: hideModal }] = useBoolean(false);
  const [confirmConflictsUpgrade, confirm, cancel] = useAsyncConfirmation({
    onInit: showModal,
    onFinish: hideModal,
  });

  return {
    modal: isVisible && <UpgradeWithConflictsModal onConfirm={confirm} onCancel={cancel} />,
    confirmConflictsUpgrade,
  };
}
