/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo } from 'react';
import { unmountComponentAtNode } from 'react-dom';
import type { Embeddable as LensEmbeddable } from '@kbn/lens-plugin/public';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { isErrorEmbeddable } from '@kbn/embeddable-plugin/public';

import { toMountPoint } from '@kbn/react-kibana-mount';

import type { CaseUI } from '../../../../common';
import { isLensEmbeddable, hasInput, getLensCaseAttachment } from './utils';

import type { ActionContext, CasesUIActionProps } from './types';
import { useCasesAddToExistingCaseModal } from '../../all_cases/selector_modal/use_cases_add_to_existing_case_modal';
import { ADD_TO_EXISTING_CASE_DISPLAYNAME } from './translations';
import { ActionWrapper } from './action_wrapper';
import { canUseCases } from '../../../client/helpers/can_use_cases';
import { getCaseOwnerByAppId } from '../../../../common/utils/owner';

export const ACTION_ID = 'embeddable_addToExistingCase';
export const DEFAULT_DARK_MODE = 'theme:darkMode' as const;

interface Props {
  embeddable: LensEmbeddable;
  onSuccess: () => void;
  onClose: (theCase?: CaseUI) => void;
}

const AddExistingCaseModalWrapper: React.FC<Props> = ({ embeddable, onClose, onSuccess }) => {
  const modal = useCasesAddToExistingCaseModal({
    onClose,
    onSuccess,
  });

  const attachments = useMemo(() => {
    const { timeRange } = embeddable.getInput();
    const attributes = embeddable.getFullAttributes();
    // we've checked attributes exists before rendering (isCompatible), attributes should not be undefined here
    return attributes != null ? [getLensCaseAttachment({ attributes, timeRange })] : [];
  }, [embeddable]);
  useEffect(() => {
    modal.open({ getAttachments: () => attachments });
  }, [attachments, modal]);

  return null;
};

AddExistingCaseModalWrapper.displayName = 'AddExistingCaseModalWrapper';

export const createAddToExistingCaseLensAction = ({
  core,
  plugins,
  storage,
  history,
  caseContextProps,
}: CasesUIActionProps) => {
  const { application: applicationService, i18n, theme } = core;

  let currentAppId: string | undefined;

  applicationService?.currentAppId$.subscribe((appId) => {
    currentAppId = appId;
  });

  return createAction<ActionContext>({
    id: ACTION_ID,
    type: 'actionButton',
    getIconType: () => 'casesApp',
    getDisplayName: () => ADD_TO_EXISTING_CASE_DISPLAYNAME,
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

      const cleanupDom = (shouldCleanup?: boolean) => {
        if (targetDomElement != null && shouldCleanup) {
          unmountComponentAtNode(targetDomElement);
        }
      };

      const onClose = (theCase?: CaseUI, isCreateCase?: boolean) => {
        const closeModalClickedScenario = theCase == null && !isCreateCase;
        const caseSelectedScenario = theCase != null;
        // When `Creating` a case from the `add to existing case modal`,
        // we close the modal and then open the flyout.
        // If we clean up dom when closing the modal, then the flyout won't open.
        // Thus we do not clean up dom when `Creating` a case.
        const shouldCleanup = closeModalClickedScenario || caseSelectedScenario;
        cleanupDom(shouldCleanup);
      };

      const onSuccess = () => {
        cleanupDom(true);
      };
      const mount = toMountPoint(
        <ActionWrapper
          core={core}
          caseContextProps={caseContextProps}
          storage={storage}
          plugins={plugins}
          history={history}
          currentAppId={currentAppId}
        >
          <AddExistingCaseModalWrapper
            embeddable={embeddable}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        </ActionWrapper>,
        { i18n, theme }
      );

      mount(targetDomElement);
    },
  });
};
