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

export interface UseAddToNewCaseProps {
  onClick?: () => void;
  timeRange: { from: string; to: string } | null;
  lensAttributes: LensAttributes | null;
  userCanCrud: boolean;
}

const owner = APP_ID;

export const useAddToNewCase = ({
  onClick,
  timeRange,
  lensAttributes,
  userCanCrud,
}: UseAddToNewCaseProps) => {
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

  const createCaseFlyout = cases.hooks.getUseCasesAddToNewCaseFlyout({
    attachments,
  });

  const onAddToNewCaseClicked = useCallback(() => {
    if (onClick) {
      onClick();
    }

    createCaseFlyout.open();
  }, [createCaseFlyout, onClick]);

  return {
    onAddToNewCaseClicked,
    disabled: lensAttributes == null || timeRange == null || !userCanCrud,
  };
};
