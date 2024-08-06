/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { Embeddable } from '@kbn/embeddable-plugin/public';
import { RESET_GROUP_BY_FIELDS } from '../../../../common/components/chart_settings_popover/configurations/default/translations';
import type { LensDataTableEmbeddable } from '../../../../common/components/visualization_actions/types';

/**
 * Returns `true` when the alerts histogram initial loading spinner should be shown
 *
 * @param isInitialLoading The loading spinner will only be displayed if this value is `true`, because after initial load, a different, non-spinner loading indicator is displayed
 * @param isLoadingAlerts When `true`, IO is being performed to request alerts (for rendering in the histogram)
 */
export const showInitialLoadingSpinner = ({
  isInitialLoading,
  isLoadingAlerts,
}: {
  isInitialLoading: boolean;
  isLoadingAlerts: boolean;
}): boolean => isInitialLoading && isLoadingAlerts;

interface CreateResetGroupByFieldActionProps {
  callback?: () => void;
  order?: number;
}

type CreateResetGroupByFieldAction = (params?: CreateResetGroupByFieldActionProps) => Action;
export const createResetGroupByFieldAction: CreateResetGroupByFieldAction = ({
  callback,
  order,
} = {}) => ({
  id: 'resetGroupByField',
  getDisplayName(): string {
    return RESET_GROUP_BY_FIELDS;
  },
  getIconType(): string | undefined {
    return 'editorRedo';
  },
  type: 'actionButton',
  async isCompatible(): Promise<boolean> {
    return true;
  },
  async execute({
    embeddable,
  }: ActionExecutionContext<{
    embeddable: Embeddable<LensDataTableEmbeddable>;
  }>): Promise<void> {
    callback?.();

    const input = embeddable.getInput();
    const {
      attributes: {
        state: {
          visualization: { columns },
        },
      },
    } = input;

    // Unhide all the columns
    embeddable.updateInput({
      ...input,
      attributes: {
        ...input.attributes,
        state: {
          ...input.attributes.state,
          visualization: {
            ...input.attributes.state.visualization,
            columns: columns.map((c) => ({
              ...c,
              hidden: false,
            })),
          },
        },
      },
    });
  },
  order,
});

export const createGenericSubtitle = (
  isInitialLoading: boolean,
  showTotalAlertsCount: boolean,
  totalAlerts: string
) => !isInitialLoading && showTotalAlertsCount && totalAlerts;

export const createEmbeddedDataSubtitle = (
  embeddedDataLoaded: boolean,
  embeddedDataAvailable: boolean,
  totalAlerts: string
) => embeddedDataLoaded && embeddedDataAvailable && totalAlerts;
