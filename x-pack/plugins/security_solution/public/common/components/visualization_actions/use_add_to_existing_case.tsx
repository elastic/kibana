/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo } from 'react';
import { CommentType } from '../../../../../cases/common';

import { APP_ID } from '../../../../common/constants';
import { useKibana } from '../../lib/kibana/kibana_react';

import { LensAttributes } from './types';

const owner = APP_ID;

export const useAddToExistingCase = ({
  onAddToCaseClicked,
  lensAttributes,
  timeRange,
  userCanCrud,
}: {
  onAddToCaseClicked?: () => void;
  lensAttributes: LensAttributes | null;
  timeRange: { from: string; to: string } | null;
  userCanCrud: boolean;
}) => {
  const { cases } = useKibana().services;
  const attachments = useMemo(() => {
    return [
      {
        comment: `!{lens${JSON.stringify({
          timeRange,
          attributes: lensAttributes,
        })}}`,
        owner,
        type: CommentType.user as const,
      },
    ];
  }, [lensAttributes, timeRange]);

  const selectCaseModal = cases.hooks.getUseCasesAddToExistingCaseModal({
    attachments,
    onClose: onAddToCaseClicked,
  });

  const onAddToExistingCaseClicked = useCallback(() => {
    if (onAddToCaseClicked) {
      onAddToCaseClicked();
    }
    selectCaseModal.open();
  }, [onAddToCaseClicked, selectCaseModal]);

  return {
    onAddToExistingCaseClicked,
    disabled: lensAttributes == null || timeRange == null || !userCanCrud,
  };
};
