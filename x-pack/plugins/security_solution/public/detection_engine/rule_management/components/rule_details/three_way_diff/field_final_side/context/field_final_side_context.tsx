/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, type PropsWithChildren, useMemo } from 'react';
import { useBoolean } from '@kbn/react-hooks';
import type { UpgradeableDiffableFields } from '../../../../../model/prebuilt_rule_upgrade/fields';
import { invariant } from '../../../../../../../../common/utils/invariant';
import { FieldFinalSideMode } from '../field_final_side_mode';

interface FieldFinalSideState {
  /**
   * Field name of an upgradable field from DiffableRule
   */
  fieldName: UpgradeableDiffableFields;
  /**
   * Field final side view mode `Readonly` or `Editing`
   */
  mode: FieldFinalSideMode;
}

interface FieldFinalSideActions {
  /**
   * Sets Readonly field final side view mode
   */
  setReadOnlyMode: () => void;
  /**
   * Sets Editing field final side view mode
   */
  setEditMode: () => void;
}

interface FieldFinalSideContextType {
  state: FieldFinalSideState;
  actions: FieldFinalSideActions;
}

const FieldFinalSideContext = createContext<FieldFinalSideContextType | null>(null);

interface FieldFinalSideContextProviderProps {
  fieldName: UpgradeableDiffableFields;
  initialMode: FieldFinalSideMode;
}

export function FieldFinalSideContextProvider({
  children,
  fieldName,
  initialMode,
}: PropsWithChildren<FieldFinalSideContextProviderProps>) {
  const [editing, { on: setEditMode, off: setReadOnlyMode }] = useBoolean(
    initialMode === FieldFinalSideMode.Edit
  );

  const contextValue: FieldFinalSideContextType = useMemo(
    () => ({
      state: {
        fieldName,
        mode: editing ? FieldFinalSideMode.Edit : FieldFinalSideMode.Readonly,
      },
      actions: {
        setReadOnlyMode,
        setEditMode,
      },
    }),
    [fieldName, editing, setReadOnlyMode, setEditMode]
  );

  return (
    <FieldFinalSideContext.Provider value={contextValue}>{children}</FieldFinalSideContext.Provider>
  );
}

export function useFieldFinalSideContext(): FieldFinalSideContextType {
  const context = useContext(FieldFinalSideContext);

  invariant(
    context !== null,
    'useFieldFinalSideContext must be used inside a FieldFinalSideContextProvider'
  );

  return context;
}
