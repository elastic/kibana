/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { Action, Trigger } from '@kbn/ui-actions-plugin/public';
import { useKibana } from '../../lib/kibana/kibana_react';
import { useAddToExistingCase } from './use_add_to_existing_case';
import { useAddToNewCase } from './use_add_to_new_case';
import { useSaveToLibrary } from './use_save_to_library';

import { VisualizationContextMenuActions } from './types';
import type { LensAttributes } from './types';
import {
  ADDED_TO_LIBRARY,
  ADD_TO_EXISTING_CASE,
  ADD_TO_NEW_CASE,
  INSPECT,
  OPEN_IN_LENS,
} from './translations';

export const DEFAULT_ACTIONS: VisualizationContextMenuActions[] = [
  VisualizationContextMenuActions.inspect,
  VisualizationContextMenuActions.addToNewCase,
  VisualizationContextMenuActions.addToExistingCase,
  VisualizationContextMenuActions.saveToLibrary,
  VisualizationContextMenuActions.openInLens,
];

export const INSPECT_ACTION: VisualizationContextMenuActions[] = [
  VisualizationContextMenuActions.inspect,
];

export const VISUALIZATION_CONTEXT_MENU_TRIGGER: Trigger = {
  id: 'VISUALIZATION_CONTEXT_MENU_TRIGGER',
};

export const useActions = ({
  attributes,
  extraActions,
  inspectActionProps,
  timeRange,
  withActions = [],
}: {
  attributes: LensAttributes | null;
  extraActions?: Action[];
  inspectActionProps: {
    handleInspectClick: () => void;
    isInspectButtonDisabled: boolean;
  };
  timeRange: { from: string; to: string };
  withActions?: VisualizationContextMenuActions[];
}) => {
  const { services } = useKibana();
  const {
    lens: { navigateToPrefilledEditor, canUseEditor },
  } = services;

  const onOpenInLens = useCallback(() => {
    if (!timeRange || !attributes) {
      return;
    }
    navigateToPrefilledEditor(
      {
        id: '',
        timeRange,
        attributes,
      },
      {
        openInNewTab: true,
      }
    );
  }, [attributes, navigateToPrefilledEditor, timeRange]);

  const { disabled: isAddToExistingCaseDisabled, onAddToExistingCaseClicked } =
    useAddToExistingCase({
      lensAttributes: attributes,
      timeRange,
    });

  const { onAddToNewCaseClicked, disabled: isAddToNewCaseDisabled } = useAddToNewCase({
    timeRange,
    lensAttributes: attributes,
  });

  const { openSaveVisualizationFlyout, disableVisualizations } = useSaveToLibrary({ attributes });

  const contextMenuActionDefinitions = useMemo(
    () => [
      ...(extraActions ?? []),
      {
        id: VisualizationContextMenuActions.inspect,
        getDisplayName: () => INSPECT,
        getIconType: () => 'inspect',
        type: 'actionButton',
        execute: async () => {
          inspectActionProps.handleInspectClick();
        },
        disabled: inspectActionProps.isInspectButtonDisabled,
        isCompatible: async () => withActions.includes(VisualizationContextMenuActions.inspect),
        order: 4,
      },
      {
        id: VisualizationContextMenuActions.addToExistingCase,
        getDisplayName: () => ADD_TO_EXISTING_CASE,
        getIconType: () => 'casesApp',
        type: 'actionButton',
        execute: async () => {
          onAddToExistingCaseClicked();
        },
        disabled: isAddToExistingCaseDisabled,
        isCompatible: async () =>
          withActions.includes(VisualizationContextMenuActions.addToExistingCase),
        order: 2,
      },
      {
        id: VisualizationContextMenuActions.addToNewCase,
        getDisplayName: () => ADD_TO_NEW_CASE,
        getIconType: () => 'casesApp',
        type: 'actionButton',
        execute: async () => {
          onAddToNewCaseClicked();
        },
        disabled: isAddToNewCaseDisabled,
        isCompatible: async () =>
          withActions.includes(VisualizationContextMenuActions.addToNewCase),
        order: 3,
      },
      {
        id: VisualizationContextMenuActions.openInLens,
        getDisplayName: () => OPEN_IN_LENS,
        getIconType: () => 'visArea',
        type: 'actionButton',
        execute: async () => {
          onOpenInLens();
        },
        isCompatible: async () =>
          canUseEditor() && withActions.includes(VisualizationContextMenuActions.openInLens),
        order: 0,
      },
      {
        id: VisualizationContextMenuActions.saveToLibrary,
        getDisplayName: () => ADDED_TO_LIBRARY,
        getIconType: () => 'save',
        type: 'actionButton',
        execute: async () => {
          openSaveVisualizationFlyout();
        },
        disabled: disableVisualizations,
        isCompatible: async () =>
          withActions.includes(VisualizationContextMenuActions.saveToLibrary),
        order: 1,
      },
    ],
    [
      canUseEditor,
      disableVisualizations,
      extraActions,
      inspectActionProps,
      isAddToExistingCaseDisabled,
      isAddToNewCaseDisabled,
      onAddToExistingCaseClicked,
      onAddToNewCaseClicked,
      onOpenInLens,
      openSaveVisualizationFlyout,
      withActions,
    ]
  );

  return contextMenuActionDefinitions;
};
