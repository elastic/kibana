/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { createExploratoryViewRoutePath, createExploratoryViewUrl } from '../configurations/utils';
import { ReportViewType } from '../types';
import { AllSeries } from '../hooks/use_series_storage';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import {
  Action,
  ActionExecutionContext,
} from '../../../../../../../../src/plugins/ui_actions/public';
import { ObservabilityAppServices } from '../../../../application/types';

export type ActionTypes = 'explore' | 'save' | 'addToCase' | 'openInLens';

export function useActions({
  withActions,
  attributes,
  reportType,
  setIsSaveOpen,
  setAddToCaseOpen,
  appId = 'observability',
  timeRange,
  lensAttributes,
}: {
  withActions?: boolean | ActionTypes[];
  reportType: ReportViewType;
  attributes: AllSeries;
  appId?: 'securitySolutionUI' | 'observability';
  setIsSaveOpen: (val: boolean) => void;
  setAddToCaseOpen: (val: boolean) => void;
  timeRange: { from: string; to: string };
  lensAttributes: any;
}) {
  const kServices = useKibana<ObservabilityAppServices>().services;

  const { lens } = kServices;

  const [defaultActions, setDefaultActions] = useState(['explore', 'save', 'addToCase']);

  useEffect(() => {
    if (withActions === false) {
      setDefaultActions([]);
    }
    if (Array.isArray(withActions)) {
      setDefaultActions(withActions);
    }
  }, [withActions]);

  const { http, application } = useKibana().services;

  const href = createExploratoryViewUrl(
    { reportType, allSeries: attributes },
    http?.basePath.get(),
    appId
  );

  const routePath = createExploratoryViewRoutePath({ reportType, allSeries: attributes });

  const openInLensCallback = useCallback(() => {
    if (lensAttributes) {
      lens.navigateToPrefilledEditor(
        {
          id: '',
          timeRange,
          attributes: lensAttributes,
        },
        {
          openInNewTab: true,
        }
      );
    }
  }, [lens, lensAttributes, timeRange]);

  const exploreCallback = useCallback(() => {
    application?.navigateToApp(appId, { path: routePath });
  }, [appId, application, routePath]);

  const saveCallback = useCallback(() => {
    setIsSaveOpen(true);
  }, [setIsSaveOpen]);

  const addToCaseCallback = useCallback(() => {
    setAddToCaseOpen(true);
  }, [setAddToCaseOpen]);

  return defaultActions.map<Action>((action) => {
    if (action === 'save') {
      return getSaveAction({ callback: saveCallback });
    }
    if (action === 'addToCase') {
      return getAddToCaseAction({ callback: addToCaseCallback });
    }
    if (action === 'openInLens') {
      return getOpenInLensAction({ callback: openInLensCallback });
    }
    return getExploreAction({ href, callback: exploreCallback });
  });
}

const getOpenInLensAction = ({ callback }: { callback: () => void }): Action => {
  return {
    id: 'expViewOpenInLens',
    getDisplayName(context: ActionExecutionContext<object>): string {
      return i18n.translate('xpack.observability.expView.openInLens', {
        defaultMessage: 'Open in Lens',
      });
    },
    getIconType(context: ActionExecutionContext<object>): string | undefined {
      return 'visArea';
    },
    type: 'link',
    async isCompatible(context: ActionExecutionContext<object>): Promise<boolean> {
      return true;
    },
    async execute(context: ActionExecutionContext<object>): Promise<void> {
      callback();
      return;
    },
  };
};

const getExploreAction = ({ href, callback }: { href: string; callback: () => void }): Action => {
  return {
    id: 'expViewExplore',
    getDisplayName(context: ActionExecutionContext<object>): string {
      return i18n.translate('xpack.observability.expView.explore', {
        defaultMessage: 'Explore',
      });
    },
    getIconType(context: ActionExecutionContext<object>): string | undefined {
      return 'visArea';
    },
    type: 'link',
    async isCompatible(context: ActionExecutionContext<object>): Promise<boolean> {
      return true;
    },
    async getHref(context: ActionExecutionContext<object>): Promise<string | undefined> {
      return href;
    },
    async execute(context: ActionExecutionContext<object>): Promise<void> {
      callback();
      return;
    },
    order: 50,
  };
};

const getSaveAction = ({ callback }: { callback: () => void }): Action => {
  return {
    id: 'expViewSave',
    getDisplayName(context: ActionExecutionContext<object>): string {
      return i18n.translate('xpack.observability.expView.save', {
        defaultMessage: 'Save visualization',
      });
    },
    getIconType(context: ActionExecutionContext<object>): string | undefined {
      return 'save';
    },
    type: 'actionButton',
    async isCompatible(context: ActionExecutionContext<object>): Promise<boolean> {
      return true;
    },
    async execute(context: ActionExecutionContext<object>): Promise<void> {
      callback();
      return;
    },
    order: 49,
  };
};

const getAddToCaseAction = ({ callback }: { callback: () => void }): Action => {
  return {
    id: 'expViewAddToCase',
    getDisplayName(context: ActionExecutionContext<object>): string {
      return i18n.translate('xpack.observability.expView.addToCase', {
        defaultMessage: 'Add to case',
      });
    },
    getIconType(context: ActionExecutionContext<object>): string | undefined {
      return 'link';
    },
    type: 'actionButton',
    async isCompatible(context: ActionExecutionContext<object>): Promise<boolean> {
      return true;
    },
    async execute(context: ActionExecutionContext<object>): Promise<void> {
      callback();
      return;
    },
    order: 48,
  };
};
