/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { unmountComponentAtNode } from 'react-dom';
import { LensApi } from "@kbn/lens-plugin/public";
import { toMountPoint } from '@kbn/react-kibana-mount';
import { ActionWrapper } from "./action_wrapper";
import { CasesUIActionProps } from "./types";
import type { CaseUI } from '../../../../common';
import { getLensCaseAttachment } from './utils';
import { useCasesAddToExistingCaseModal } from '../../all_cases/selector_modal/use_cases_add_to_existing_case_modal';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';

interface Props {
  lensApi: LensApi;
  onSuccess: () => void;
  onClose: (theCase?: CaseUI) => void;
}

const AddExistingCaseModalWrapper: React.FC<Props> = ({ lensApi, onClose, onSuccess }) => {
  const modal = useCasesAddToExistingCaseModal({
    onClose,
    onSuccess,
  });

  const timeRange = useStateFromPublishingSubject(lensApi.timeRange$);
  const parentTimeRange = useStateFromPublishingSubject(lensApi.parentApi?.timeRange$);

  const attachments = useMemo(() => {
    const appliedTimeRange = timeRange ?? parentTimeRange;
    const attributes = lensApi.getFullAttributes();
    return !attributes || !appliedTimeRange
      ? []
      : [getLensCaseAttachment({ attributes, timeRange: appliedTimeRange })];
  }, [lensApi, timeRange, parentTimeRange]);
  useEffect(() => {
    modal.open({ getAttachments: () => attachments });
  }, [attachments, modal]);

  return null;
};

export function openModal(lensApi: LensApi, currentAppId: string | undefined, casesProps: CasesUIActionProps) {  
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
      core={casesProps.core}
      caseContextProps={casesProps.caseContextProps}
      storage={casesProps.storage}
      plugins={casesProps.plugins}
      history={casesProps.history}
      currentAppId={currentAppId}
    >
      <AddExistingCaseModalWrapper
        lensApi={lensApi}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </ActionWrapper>,
    { i18n: casesProps.core.i18n, theme: casesProps.core.theme }
  );

  mount(targetDomElement);
}