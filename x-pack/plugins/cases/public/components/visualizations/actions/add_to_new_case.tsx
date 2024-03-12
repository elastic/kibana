/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React /* , { useEffect, useMemo }*/ from 'react';
import { unmountComponentAtNode } from 'react-dom';

import { createAction } from '@kbn/ui-actions-plugin/public';
import { isErrorEmbeddable } from '@kbn/embeddable-plugin/public';

import { toMountPoint } from '@kbn/kibana-react-plugin/public';
// import type { Embeddable as LensEmbeddable } from '@kbn/lens-plugin/public';
import { getCaseOwnerByAppId } from '../../../../common/utils/owner';
import { hasInput, isLensEmbeddable /* getLensCaseAttachment*/ } from './utils';

import type { ActionContext, CasesUIActionProps } from './types';
import { /* ADD_TO_CASE_SUCCESS,*/ ADD_TO_NEW_CASE_DISPLAYNAME } from './translations';
// import { useCasesAddToNewCaseFlyout } from '../../create/flyout/use_cases_add_to_new_case_flyout';
// import { ActionWrapper } from './action_wrapper';
import { canUseCases } from '../../../client/helpers/can_use_cases';

export const ACTION_ID = 'embeddable_addToNewCase';
export const DEFAULT_DARK_MODE = 'theme:darkMode' as const;

export const createAddToNewCaseLensAction = ({
  core,
  plugins,
  storage,
  history,
  caseContextProps,
}: CasesUIActionProps) => {
  const { application: applicationService, theme } = core;

  let currentAppId: string | undefined;

  applicationService?.currentAppId$.subscribe((appId) => {
    currentAppId = appId;
  });

  return createAction<ActionContext>({
    id: ACTION_ID,
    type: 'actionButton',
    getIconType: () => 'casesApp',
    getDisplayName: () => ADD_TO_NEW_CASE_DISPLAYNAME,
    isCompatible: async ({ embeddable }) => {
      const owner = getCaseOwnerByAppId(currentAppId);
      const casePermissions = canUseCases(applicationService.capabilities)(
        owner ? [owner] : undefined
      );

      return (
        !isErrorEmbeddable(embeddable) &&
        isLensEmbeddable(embeddable) &&
        casePermissions.update &&
        casePermissions.create &&
        hasInput(embeddable)
      );
    },
    execute: async ({ embeddable }) => {
      const targetDomElement = document.createElement('div');
      const Wrapper = React.lazy(() => import('./wrappers/add_to_new_case_wrapper'));

      const cleanupDom = () => {
        if (targetDomElement != null) {
          unmountComponentAtNode(targetDomElement);
        }
      };

      const onClose = () => {
        cleanupDom();
      };

      const mount = toMountPoint(
        <Wrapper
          {...{
            embeddable,
            onClose,
            onSuccess: onClose,
            core,
            plugins,
            storage,
            history,
            caseContextProps,
            currentAppId,
          }}
        />,
        { theme$: theme.theme$ }
      );
      mount(targetDomElement);
    },
  });
};
