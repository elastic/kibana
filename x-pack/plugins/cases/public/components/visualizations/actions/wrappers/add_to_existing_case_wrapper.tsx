/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo } from 'react';
import type { Embeddable as LensEmbeddable } from '@kbn/lens-plugin/public';

import type { CaseUI } from '../../../../../common';
import { useCasesAddToExistingCaseModal } from '../../../all_cases/selector_modal/use_cases_add_to_existing_case_modal';
import { getLensCaseAttachment } from '../utils';
import type { ActionWrapperProps } from '../action_wrapper';
import { ActionWrapper } from '../action_wrapper';

interface AddToExistingCaseModalWrapperProps {
  embeddable: LensEmbeddable;
  onSuccess: () => void;
  onClose: (theCase?: CaseUI) => void;
}

const AddExistingCaseModalWrapper: React.FC<AddToExistingCaseModalWrapperProps> = ({
  embeddable,
  onClose,
  onSuccess,
}) => {
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

export interface AddToExistingCaseWrapperProps
  extends Pick<
      ActionWrapperProps,
      'core' | 'caseContextProps' | 'storage' | 'plugins' | 'history' | 'currentAppId'
    >,
    AddToExistingCaseModalWrapperProps {
  onClose: (theCase?: CaseUI, isCreateCase?: boolean) => void;
  onSuccess: () => void;
  embeddable: LensEmbeddable;
}

const AddToExistingCaseWrapper = (props: AddToExistingCaseWrapperProps) => (
  <ActionWrapper {...props}>
    <AddExistingCaseModalWrapper {...props} />
  </ActionWrapper>
);
AddToExistingCaseWrapper.displayName = 'AddToExistingCaseWrapper';

// eslint-disable-next-line import/no-default-export
export default AddToExistingCaseWrapper;
