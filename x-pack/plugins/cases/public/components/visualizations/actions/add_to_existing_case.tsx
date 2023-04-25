/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import ReactDOM, { unmountComponentAtNode } from 'react-dom';
import { Router } from 'react-router-dom';

import { i18n } from '@kbn/i18n';
import type { Embeddable } from '@kbn/lens-plugin/public';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { isErrorEmbeddable } from '@kbn/embeddable-plugin/public';

import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import type { IUiSettingsClient } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import type * as H from 'history';

import { CommentType } from '../../../../common';
import { isLensEmbeddable } from './utils';
import { KibanaContextProvider, KibanaServices } from '../../../common/lib/kibana';

import { getUICapabilities } from '../../../client/helpers/capabilities';
import CasesProvider from '../../cases_context';
import { OWNER_INFO } from '../../../../common/constants';
import { useCasesAddToExistingCaseModal } from '../../all_cases/selector_modal/use_cases_add_to_existing_case_modal';
import type { UIActionProps } from './types';

export const ACTION_ID = 'embeddable_addToExistingCase';
export const CASES_FEATURE_ID = 'securitySolutionCases' as const;
export const APP_NAME = 'Security' as const;
export const DEFAULT_DARK_MODE = 'theme:darkMode' as const;

const FlyoutChildren = ({ embeddable, node }) => {
  const { attributes, timeRange } = embeddable.getInput();

  const addToExistingCaseModal = useCasesAddToExistingCaseModal({
    successToaster: {
      title: i18n.translate(
        'xpack.cases.actions.visualizationActions.addToExistingCase.successMessage',
        {
          defaultMessage: 'Successfully added visualization to the case',
        }
      ),
    },
    onClose: () => {
      unmountComponentAtNode(node);
      document.body.removeChild(node);
    },
  });

  const attachments = [
    {
      comment: `!{lens${JSON.stringify({
        timeRange,
        attributes,
      })}}`,
      type: CommentType.user as const,
    },
  ];

  addToExistingCaseModal.open({ getAttachments: () => attachments });
  return null;
};

const DashboardViewAddToExistingCaseFlyout = ({
  caseContextProps,
  currentAppId,
  casesCapabilities,
  node,
  embeddable,
}) => {
  const owner = Object.values(OWNER_INFO)
    .map((i) => i.appId)
    .filter((id) => id === currentAppId);

  return (
    <CasesProvider
      value={{
        ...caseContextProps,
        owner,
        permissions: casesCapabilities,
      }}
    >
      <FlyoutChildren node={node} embeddable={embeddable} />
    </CasesProvider>
  );
};

DashboardViewAddToExistingCaseFlyout.displayName = 'DashboardViewAddToExistingCaseFlyout';

export const createAddToExistingCaseLensAction = ({
  order,
  uiSettings,
  caseContextProps,
  history,
}: {
  order?: number;
  uiSettings: IUiSettingsClient;
  history: H.History;
  caseContextProps: UIActionProps;
}) => {
  const { application: applicationService, notifications, theme, security } = KibanaServices.get();
  let currentAppId: string | undefined;
  applicationService?.currentAppId$.subscribe((appId) => {
    currentAppId = appId;
  });

  return createAction<{ embeddable: Embeddable }>({
    id: ACTION_ID,
    type: 'actionButton',
    order,
    getIconType: () => 'plusInCircle',
    getDisplayName: () =>
      i18n.translate('xpack.cases.actions.visualizationActions.addToExistingCase.displayName', {
        defaultMessage: 'Add to existing case',
      }),
    isCompatible: async ({ embeddable }) =>
      !isErrorEmbeddable(embeddable) && isLensEmbeddable(embeddable),
    execute: async ({ embeddable }) => {
      const { attributes, timeRange } = embeddable.getInput();

      const casesCapabilities = getUICapabilities(
        applicationService.capabilities[CASES_FEATURE_ID]
      );

      if (
        attributes == null ||
        timeRange == null ||
        !casesCapabilities.create ||
        !casesCapabilities.read
      ) {
        return;
      }

      const node = document.createElement('div');
      document.body.appendChild(node);

      const element = (
        <KibanaContextProvider
          services={{
            appName: APP_NAME,
            application: applicationService,
            notifications,
            theme,
            uiSettings,
            security,
          }}
        >
          <KibanaThemeProvider theme$={theme.theme$}>
            <EuiThemeProvider darkMode={uiSettings.get(DEFAULT_DARK_MODE)}>
              <Router history={history}>
                <DashboardViewAddToExistingCaseFlyout
                  caseContextProps={caseContextProps}
                  currentAppId={currentAppId}
                  casesCapabilities={casesCapabilities}
                  node={node}
                  embeddable={embeddable}
                />
              </Router>
            </EuiThemeProvider>
          </KibanaThemeProvider>
        </KibanaContextProvider>
      );
      ReactDOM.render(element, node);
    },
  });
};
