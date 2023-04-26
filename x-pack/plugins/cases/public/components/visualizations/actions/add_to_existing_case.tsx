/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';
import { unmountComponentAtNode } from 'react-dom';
import { Router } from 'react-router-dom';

import { i18n } from '@kbn/i18n';

import { createAction } from '@kbn/ui-actions-plugin/public';
import { isErrorEmbeddable } from '@kbn/embeddable-plugin/public';

import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import type { CoreStart, IUiSettingsClient } from '@kbn/core/public';
import { toMountPoint, wrapWithTheme } from '@kbn/kibana-react-plugin/public';
import type * as H from 'history';

import type { Case } from '../../../../common';
import { CommentType } from '../../../../common';
import { isLensEmbeddable } from './utils';
import { KibanaContextProvider, KibanaServices } from '../../../common/lib/kibana';

import { getUICapabilities } from '../../../client/helpers/capabilities';
import CasesProvider from '../../cases_context';
import { OWNER_INFO } from '../../../../common/constants';
import type { DashboardVisualizationEmbeddable, UIActionProps } from './types';
import AllCasesSelectorModal from '../../all_cases/selector_modal';
import { useCreateAttachments } from '../../../containers/use_create_attachments';
import { useAddAttachmentToExistingCaseTransaction } from '../../../common/apm/use_cases_transactions';
import { useCasesToast } from '../../../common/use_cases_toast';
import { ADD_TO_CASE_SUCCESS } from './translations';
import { useCasesAddToNewCaseFlyout } from '../../create/flyout/use_cases_add_to_new_case_flyout';

export const ACTION_ID = 'embeddable_addToExistingCase';
export const CASES_FEATURE_ID = 'securitySolutionCases' as const;
export const APP_NAME = 'Security' as const;
export const DEFAULT_DARK_MODE = 'theme:darkMode' as const;

const DashboardViewAddToExistingCaseModal = ({
  appId,
  embeddable,
  cleanupDom,
}: {
  appId: string | undefined;
  embeddable: DashboardVisualizationEmbeddable;
  cleanupDom: () => void;
}) => {
  const { attributes, timeRange } = embeddable.getInput();

  const onClose = useCallback(
    (cleanup: boolean) => {
      // This is called when modal closed and CASE SELECTED. We don't want to clean up dom when case selected, it'll cause attach cases failure.
      if (cleanup) {
        cleanupDom();
      }
    },
    [cleanupDom]
  );

  const onCasesSelectorModalClosed = useCallback(
    (theCase?: Case) => {
      const shouldCleanup = theCase == null;
      onClose?.(shouldCleanup);
    },
    [onClose]
  );

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

  const { createAttachments } = useCreateAttachments();
  const { startTransaction } = useAddAttachmentToExistingCaseTransaction();
  const casesToasts = useCasesToast();
  const createNewCaseFlyout = useCasesAddToNewCaseFlyout({
    onClose: cleanupDom,
    onSuccess: cleanupDom,
    toastContent: ADD_TO_CASE_SUCCESS,
  });

  const onRowClick = useCallback(
    async (theCase?: Case) => {
      try {
        if (theCase === undefined || !appId) {
          onClose?.(false);
          createNewCaseFlyout.open({ attachments });
          return;
        }
        // add attachments to the case

        startTransaction({ appId, attachments });

        await createAttachments({
          caseId: theCase.id,
          caseOwner: theCase.owner,
          data: attachments,
          throwOnError: true,
        });

        casesToasts.showSuccessAttach({
          theCase,
          attachments,
          title: ADD_TO_CASE_SUCCESS,
        });

        onClose?.(true);
      } catch (error) {
        // error toast is handled
        // inside the createAttachments method
      }
    },
    [
      appId,
      attachments,
      casesToasts,
      createAttachments,
      createNewCaseFlyout,
      onClose,
      startTransaction,
    ]
  );

  return <AllCasesSelectorModal onRowClick={onRowClick} onClose={onCasesSelectorModalClosed} />;
};

DashboardViewAddToExistingCaseModal.displayName = 'DashboardViewAddToExistingCaseModal';

export const createAddToExistingCaseLensAction = ({
  order,
  coreStart,
  uiSettings,
  caseContextProps,
  history,
}: {
  order?: number;
  coreStart: CoreStart;
  uiSettings: IUiSettingsClient;
  history: H.History;
  caseContextProps: UIActionProps;
}) => {
  const { application: applicationService, theme, security } = KibanaServices.get();
  let currentAppId: string | undefined;
  applicationService?.currentAppId$.subscribe((appId) => {
    currentAppId = appId;
  });

  return createAction<{ embeddable: DashboardVisualizationEmbeddable }>({
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

      const targetDomElement = document.createElement('div');

      const cleanupDom = () => {
        if (targetDomElement != null) {
          unmountComponentAtNode(targetDomElement);
        }
      };

      const owner = Object.values(OWNER_INFO)
        .map((i) => i.appId)
        .filter((id) => id === currentAppId);

      const mount = toMountPoint(
        wrapWithTheme(
          <KibanaContextProvider
            services={{
              ...coreStart,
              security,
            }}
          >
            <EuiThemeProvider darkMode={uiSettings.get(DEFAULT_DARK_MODE)}>
              <CasesProvider
                value={{
                  ...caseContextProps,
                  owner,
                  permissions: casesCapabilities,
                }}
              >
                <Router history={history}>
                  <DashboardViewAddToExistingCaseModal
                    embeddable={embeddable}
                    appId={currentAppId}
                    cleanupDom={cleanupDom}
                  />
                </Router>
              </CasesProvider>
            </EuiThemeProvider>
          </KibanaContextProvider>,
          theme.theme$
        )
      );

      mount(targetDomElement);
    },
  });
};
