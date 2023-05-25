/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo } from 'react';
import { unmountComponentAtNode } from 'react-dom';
import { Router } from 'react-router-dom';

import { createAction } from '@kbn/ui-actions-plugin/public';
import { isErrorEmbeddable } from '@kbn/embeddable-plugin/public';

import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { CommentType } from '../../../../common';
import {
  getCaseOwner,
  getCasePermissions,
  hasCasePermissions,
  hasInput,
  isLensEmbeddable,
} from './utils';
import { KibanaContextProvider } from '../../../common/lib/kibana';

import type { ActionContext, CaseUIActionProps, DashboardVisualizationEmbeddable } from './types';
import CasesProvider from '../../cases_context';
import { ADD_TO_CASE_SUCCESS, ADD_TO_NEW_CASE_DISPLAYNAME } from './translations';
import { useCasesAddToNewCaseFlyout } from '../../create/flyout/use_cases_add_to_new_case_flyout';

export const ACTION_ID = 'embeddable_addToNewCase';
export const DEFAULT_DARK_MODE = 'theme:darkMode' as const;

interface Props {
  embeddable: DashboardVisualizationEmbeddable;
  onSuccess: () => void;
  onClose: () => void;
}

const AddToNewCaseFlyoutWrapper: React.FC<Props> = ({ embeddable, onClose, onSuccess }) => {
  const { attributes, timeRange } = embeddable.getInput();
  const createNewCaseFlyout = useCasesAddToNewCaseFlyout({
    onClose,
    onSuccess,
    toastContent: ADD_TO_CASE_SUCCESS,
  });

  const attachments = useMemo(
    () => [
      {
        comment: `!{lens${JSON.stringify({
          timeRange,
          attributes,
        })}}`,
        type: CommentType.user as const,
      },
    ],
    [attributes, timeRange]
  );

  useEffect(() => {
    createNewCaseFlyout.open({ attachments });
  }, [attachments, createNewCaseFlyout]);

  return null;
};

AddToNewCaseFlyoutWrapper.displayName = 'AddToNewCaseFlyoutWrapper';

export const createAddToNewCaseLensAction = ({
  core,
  plugins,
  storage,
  history,
  caseContextProps,
}: CaseUIActionProps) => {
  const { application: applicationService, theme, uiSettings } = core;
  let currentAppId: string | undefined;
  applicationService?.currentAppId$.subscribe((appId) => {
    currentAppId = appId;
  });

  const owner = getCaseOwner(currentAppId);
  const casePermissions = getCasePermissions(applicationService.capabilities, owner);

  return createAction<ActionContext>({
    id: ACTION_ID,
    type: 'actionButton',
    getIconType: () => 'casesApp',
    getDisplayName: () => ADD_TO_NEW_CASE_DISPLAYNAME,
    isCompatible: async ({ embeddable }) =>
      !isErrorEmbeddable(embeddable) &&
      isLensEmbeddable(embeddable) &&
      hasCasePermissions(casePermissions) &&
      hasInput(embeddable),
    execute: async ({ embeddable }) => {
      const targetDomElement = document.createElement('div');

      const cleanupDom = () => {
        if (targetDomElement != null) {
          unmountComponentAtNode(targetDomElement);
        }
      };

      const onFlyoutClose = () => {
        cleanupDom();
      };

      const mount = toMountPoint(
        <KibanaContextProvider
          services={{
            ...core,
            ...plugins,
            storage,
          }}
        >
          <EuiThemeProvider darkMode={uiSettings.get(DEFAULT_DARK_MODE)}>
            <Router history={history}>
              <CasesProvider
                value={{
                  ...caseContextProps,
                  owner,
                  permissions: casePermissions,
                }}
              >
                <AddToNewCaseFlyoutWrapper
                  embeddable={embeddable}
                  onClose={onFlyoutClose}
                  onSuccess={onFlyoutClose}
                />
              </CasesProvider>
            </Router>
          </EuiThemeProvider>
        </KibanaContextProvider>,
        { theme$: theme.theme$ }
      );

      mount(targetDomElement);
    },
  });
};
