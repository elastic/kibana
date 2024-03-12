/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import type { Embeddable as LensEmbeddable } from '@kbn/lens-plugin/public';

import { useCasesAddToNewCaseFlyout } from '../../../create/flyout/use_cases_add_to_new_case_flyout';
import { ADD_TO_CASE_SUCCESS } from '../translations';
import { getLensCaseAttachment } from '../utils';
import type { ActionWrapperProps } from '../action_wrapper';
import { ActionWrapper } from '../action_wrapper';

interface Props {
  embeddable: LensEmbeddable;
  onSuccess: () => void;
  onClose: () => void;
}

const AddToNewCaseFlyoutWrapper: React.FC<Props> = ({ embeddable, onClose, onSuccess }) => {
  const { timeRange } = embeddable.getInput();
  const attributes = embeddable.getFullAttributes();
  const createNewCaseFlyout = useCasesAddToNewCaseFlyout({
    onClose,
    onSuccess,
    toastContent: ADD_TO_CASE_SUCCESS,
  });

  // we've checked attributes exists before rendering (isCompatible), attributes should not be undefined here
  const attachments = useMemo(
    () => (attributes != null ? [getLensCaseAttachment({ attributes, timeRange })] : []),
    [attributes, timeRange]
  );

  useEffect(() => {
    createNewCaseFlyout.open({ attachments });
  }, [attachments, createNewCaseFlyout]);

  return null;
};

AddToNewCaseFlyoutWrapper.displayName = 'AddToNewCaseFlyoutWrapper';

export type AddToNewCaseWrapperProps = Pick<
  ActionWrapperProps,
  'core' | 'caseContextProps' | 'storage' | 'plugins' | 'history' | 'currentAppId'
> &
  Props;

const AddToNewCaseWrapper = (props: AddToNewCaseWrapperProps) => (
  <ActionWrapper {...props}>
    <AddToNewCaseFlyoutWrapper {...props} />
  </ActionWrapper>
);
AddToNewCaseWrapper.displayName = 'AddToNewCaseWrapper';

// eslint-disable-next-line import/no-default-export
export default AddToNewCaseWrapper;
