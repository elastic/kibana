/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';

import type { Embeddable } from '@kbn/lens-plugin/public';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { isErrorEmbeddable } from '@kbn/embeddable-plugin/public';

import { EuiThemeProvider } from '@elastic/eui';
import type { IUiSettingsClient } from '@kbn/core/public';
import { CommentType } from '../../../../common';
import { isLensEmbeddable } from './utils';
import { KibanaContextProvider, KibanaServices } from '../../../common/lib/kibana';

import { getUICapabilities } from '../../../client/helpers/capabilities';
import { useCasesAddToNewCaseFlyout } from '../../create/flyout/use_cases_add_to_new_case_flyout';
import type { CasesContextProps } from '../../cases_context';
import CasesProvider from '../../cases_context';
import { OWNER_INFO } from '../../../../common/constants';

export const ACTION_ID = 'embeddable_addToExistingCase';
export const CASES_FEATURE_ID = 'securitySolutionCases' as const;
export const APP_NAME = 'Security' as const;
export const DEFAULT_DARK_MODE = 'theme:darkMode' as const;

export const createAddToExistingCaseLensAction = ({
  order,
  uiSettings,
  getCreateCaseFlyoutProps,
}: {
  order?: number;
  uiSettings: IUiSettingsClient;
  getCreateCaseFlyoutProps: CasesContextProps;
}) => {
  const { application: applicationService } = KibanaServices.get();
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

      const attachments = [
        {
          comment: `!{lens${JSON.stringify({
            timeRange,
            attributes,
          })}}`,
          type: CommentType.user as const,
        },
      ];

      const Flyout = () => {
        const FlyoutChildren = () => {
          const createCaseFlyout = useCasesAddToNewCaseFlyout({
            toastContent: i18n.translate(
              'xpack.cases.actions.visualizationActions.addToNewCase.successMessage',
              {
                defaultMessage: 'Successfully added visualization to the case',
              }
            ),
          });

          createCaseFlyout.open({ attachments });
        };

        return (
          <CasesProvider
            value={{
              ...getCreateCaseFlyoutProps,
              owner: Object.values(OWNER_INFO)
                .map((i) => i.appId)
                .filter((id) => id === currentAppId),
              permissions: casesCapabilities,
              // basePath: basePath ?? DEFAULT_BASE_PATH,
              // features: features ?? {},
              // releasePhase: releasePhase ?? 'ga',
            }}
          >
            {FlyoutChildren}
          </CasesProvider>
        );
      };

      Flyout.displayName = 'Flyout';

      const node = document.createElement('div');
      document.body.appendChild(node);

      const element = (
        <KibanaContextProvider
          services={{
            appName: APP_NAME,
            ...applicationService,
          }}
        >
          <EuiThemeProvider darkMode={uiSettings.get(DEFAULT_DARK_MODE)}>{Flyout}</EuiThemeProvider>
        </KibanaContextProvider>
      );
      ReactDOM.render(element, node);
      console.log('add to existing case');
    },
  });
};
