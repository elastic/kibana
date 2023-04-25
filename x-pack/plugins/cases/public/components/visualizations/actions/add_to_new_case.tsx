/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';

import type { Embeddable } from '@kbn/lens-plugin/public';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { isErrorEmbeddable } from '@kbn/embeddable-plugin/public';

import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import type { CoreStart, IUiSettingsClient } from '@kbn/core/public';
import { toMountPoint, wrapWithTheme } from '@kbn/kibana-react-plugin/public';
import { useCasesToast } from '../../../common/use_cases_toast';
import type { Case } from '../../../../common';
import { CommentType } from '../../../../common';
import { isLensEmbeddable } from './utils';
import { KibanaContextProvider } from '../../../common/lib/kibana';

import { getUICapabilities } from '../../../client/helpers/capabilities';
import { OWNER_INFO } from '../../../../common/constants';
import type { UIActionProps } from './types';
import CasesProvider from '../../cases_context';
import CreateCaseFlyout from '../../create/flyout';

export const ACTION_ID = 'embeddable_addToNewCase';
export const CASES_FEATURE_ID = 'securitySolutionCases' as const;
export const APP_NAME = 'Security' as const;
export const DEFAULT_DARK_MODE = 'theme:darkMode' as const;

interface Props {
  embeddable: Embeddable;
  onSuccess: () => void;
  onClose: () => void;
}

const FlyoutWrapper: React.FC<Props> = ({ embeddable, onClose, onSuccess }) => {
  const { attributes, timeRange } = embeddable.getInput();
  const casesToasts = useCasesToast();
  const attachments = [
    {
      comment: `!{lens${JSON.stringify({
        timeRange,
        attributes,
      })}}`,
      type: CommentType.user as const,
    },
  ];

  const onSuccessFlyout = (theCase: Case) => {
    onSuccess();

    casesToasts.showSuccessAttach({
      theCase,
      attachments: attachments ?? [],
      title: 'Visualization added successfully',
    });
  };

  return (
    <CreateCaseFlyout onClose={onClose} attachments={attachments} onSuccess={onSuccessFlyout} />
  );
};

FlyoutWrapper.displayName = 'FlyoutWrapper';

export const createAddToNewCaseLensAction = ({
  order,
  coreStart,
  uiSettings,
  caseContextProps,
}: {
  order?: number;
  coreStart: CoreStart;
  uiSettings: IUiSettingsClient;
  caseContextProps: UIActionProps;
}) => {
  const { application: applicationService, theme } = coreStart;
  let currentAppId: string | undefined;
  applicationService?.currentAppId$.subscribe((appId) => {
    currentAppId = appId;
  });

  return createAction<{ embeddable: Embeddable; coreStart: CoreStart }>({
    id: ACTION_ID,
    type: 'actionButton',
    order,
    getIconType: () => 'plusInCircle',
    getDisplayName: () =>
      i18n.translate('xpack.cases.actions.visualizationActions.addToNewCase.displayName', {
        defaultMessage: 'Add to new case',
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

      const onFlyoutClose = () => {
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
                <FlyoutWrapper
                  embeddable={embeddable}
                  onClose={onFlyoutClose}
                  onSuccess={cleanupDom}
                />
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
