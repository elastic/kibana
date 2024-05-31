/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { Action, Trigger } from '@kbn/ui-actions-plugin/public';

import { createAction } from '@kbn/ui-actions-plugin/public';
import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import type { LensProps } from '@kbn/cases-plugin/public/types';
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

const ACTION_DEFINITION: Record<
  VisualizationContextMenuActions,
  Omit<ActionDefinition, 'execute'>
> = {
  [VisualizationContextMenuActions.inspect]: {
    id: VisualizationContextMenuActions.inspect,
    getDisplayName: () => INSPECT,
    getIconType: () => 'inspect',
    type: 'actionButton',
    order: 4,
  },
  [VisualizationContextMenuActions.addToNewCase]: {
    id: VisualizationContextMenuActions.addToNewCase,
    getDisplayName: () => ADD_TO_NEW_CASE,
    getIconType: () => 'casesApp',
    type: 'actionButton',
    order: 3,
  },
  [VisualizationContextMenuActions.addToExistingCase]: {
    id: VisualizationContextMenuActions.addToExistingCase,
    getDisplayName: () => ADD_TO_EXISTING_CASE,
    getIconType: () => 'casesApp',
    type: 'actionButton',
    order: 2,
  },
  [VisualizationContextMenuActions.saveToLibrary]: {
    id: VisualizationContextMenuActions.saveToLibrary,
    getDisplayName: () => ADDED_TO_LIBRARY,
    getIconType: () => 'save',
    type: 'actionButton',
    order: 1,
  },
  [VisualizationContextMenuActions.openInLens]: {
    id: VisualizationContextMenuActions.openInLens,
    getDisplayName: () => OPEN_IN_LENS,
    getIconType: () => 'visArea',
    type: 'actionButton',
    order: 0,
  },
};

export const useActions = ({
  attributes,
  lensMetadata,
  extraActions,
  inspectActionProps,
  timeRange,
  withActions = DEFAULT_ACTIONS,
}: {
  attributes: LensAttributes | null;
  lensMetadata?: LensProps['metadata'];
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
      lensMetadata,
    });

  const { onAddToNewCaseClicked, disabled: isAddToNewCaseDisabled } = useAddToNewCase({
    timeRange,
    lensAttributes: attributes,
    lensMetadata,
  });

  const { openSaveVisualizationFlyout, disableVisualizations } = useSaveToLibrary({ attributes });

  const allActions: Action[] = useMemo(
    () =>
      [
        createAction({
          ...ACTION_DEFINITION[VisualizationContextMenuActions.inspect],
          execute: async () => {
            inspectActionProps.handleInspectClick();
          },
          disabled: inspectActionProps.isInspectButtonDisabled,
          isCompatible: async () => withActions.includes(VisualizationContextMenuActions.inspect),
        }),
        createAction({
          ...ACTION_DEFINITION[VisualizationContextMenuActions.addToNewCase],
          execute: async () => {
            onAddToNewCaseClicked();
          },
          disabled: isAddToNewCaseDisabled,
          isCompatible: async () =>
            withActions.includes(VisualizationContextMenuActions.addToNewCase),
        }),
        createAction({
          ...ACTION_DEFINITION[VisualizationContextMenuActions.addToExistingCase],
          execute: async () => {
            onAddToExistingCaseClicked();
          },
          disabled: isAddToExistingCaseDisabled,
          isCompatible: async () =>
            withActions.includes(VisualizationContextMenuActions.addToExistingCase),
          order: 2,
        }),
        createAction({
          ...ACTION_DEFINITION[VisualizationContextMenuActions.saveToLibrary],
          execute: async () => {
            openSaveVisualizationFlyout();
          },
          disabled: disableVisualizations,
          isCompatible: async () =>
            withActions.includes(VisualizationContextMenuActions.saveToLibrary),
          order: 1,
        }),
        createAction({
          ...ACTION_DEFINITION[VisualizationContextMenuActions.openInLens],
          execute: async () => {
            onOpenInLens();
          },
          isCompatible: async () =>
            canUseEditor() && withActions.includes(VisualizationContextMenuActions.openInLens),
          order: 0,
        }),
        ...(extraActions ?? []),
      ].map((a, i, totalActions) => {
        const order = Math.max(totalActions.length - (1 + i), 0);
        return {
          ...a,
          order,
        };
      }),
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

  return allActions;
};
