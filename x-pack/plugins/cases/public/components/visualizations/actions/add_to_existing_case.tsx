/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { unmountComponentAtNode } from 'react-dom';
import { Router } from 'react-router-dom';

import { i18n } from '@kbn/i18n';
import type { Embeddable } from '@kbn/lens-plugin/public';
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
import type { UIActionProps } from './types';
import AllCasesSelectorModal from '../../all_cases/selector_modal';
import { useCreateAttachments } from '../../../containers/use_create_attachments';
import { useAddAttachmentToExistingCaseTransaction } from '../../../common/apm/use_cases_transactions';
import { useCasesToast } from '../../../common/use_cases_toast';

export const ACTION_ID = 'embeddable_addToExistingCase';
export const CASES_FEATURE_ID = 'securitySolutionCases' as const;
export const APP_NAME = 'Security' as const;
export const DEFAULT_DARK_MODE = 'theme:darkMode' as const;

const DashboardViewAddToExistingCaseModal = ({
  onClose,
  embeddable,
  appId,
}: {
  embeddable: Embeddable;
  onClose: () => void;
  appId: string | undefined;
}) => {
  const { attributes, timeRange } = embeddable.getInput();

  const attachments = [
    {
      comment: `!{lens${JSON.stringify({
        timeRange,
        attributes,
      })}}`,
      type: CommentType.user as const,
    },
  ];
  const { createAttachments } = useCreateAttachments();
  const { startTransaction } = useAddAttachmentToExistingCaseTransaction();
  const casesToasts = useCasesToast();

  const onRowClick = async (theCase?: Case) => {
    try {
      if (theCase === undefined || !appId) {
        // closeModal();
        // createNewCaseFlyout.open({ attachments });
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
        title: 'Visualization added successfully',
        // content: props.successToaster?.content,
      });
    } catch (error) {
      // error toast is handled
      // inside the createAttachments method
    }
  };

  return <AllCasesSelectorModal onRowClick={onRowClick} onClose={onClose} />;
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

      const targetDomElement = document.createElement('div');

      const cleanupDom = () => {
        if (targetDomElement != null) {
          unmountComponentAtNode(targetDomElement);
        }
      };

      const onModalClose = () => {
        cleanupDom();
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
                    onClose={onModalClose}
                    appId={currentAppId}
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
