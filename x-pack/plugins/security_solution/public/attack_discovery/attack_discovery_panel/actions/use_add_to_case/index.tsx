/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '@kbn/cases-plugin/common';
import type { CaseAttachmentWithoutOwner } from '@kbn/cases-plugin/public/types';
import { useAssistantContext } from '@kbn/elastic-assistant';
import type { Replacements } from '@kbn/elastic-assistant-common';
import React, { useCallback, useMemo } from 'react';

import { useKibana } from '../../../../common/lib/kibana';
import * as i18n from './translations';

interface Props {
  canUserCreateAndReadCases: () => boolean;
  title: string;
  onClick?: () => void;
}

export const useAddToNewCase = ({
  canUserCreateAndReadCases,
  title,
  onClick,
}: Props): {
  disabled: boolean;
  onAddToNewCase: ({
    alertIds,
    markdownComments,
    replacements,
  }: {
    alertIds: string[];
    markdownComments: string[];
    replacements?: Replacements;
  }) => void;
} => {
  const { cases } = useKibana().services;
  const { alertsIndexPattern } = useAssistantContext();

  const createCaseFlyout = cases.hooks.useCasesAddToNewCaseFlyout({
    initialValue: {
      description: i18n.CASE_DESCRIPTION(title),
      title,
    },
    toastContent: i18n.ADD_TO_CASE_SUCCESS,
  });
  const openCreateCaseFlyout = useCallback(
    ({
      alertIds,
      headerContent,
      markdownComments,
      replacements,
    }: {
      alertIds: string[];
      headerContent?: React.ReactNode;
      markdownComments: string[];
      replacements?: Replacements;
    }) => {
      const userCommentAttachments = markdownComments.map<CaseAttachmentWithoutOwner>((x) => ({
        comment: x,
        type: AttachmentType.user,
      }));

      const alertAttachments = alertIds.map<CaseAttachmentWithoutOwner>((alertId) => ({
        alertId: replacements != null ? replacements[alertId] ?? alertId : alertId,
        index: alertsIndexPattern ?? '',
        rule: {
          id: null,
          name: null,
        },
        type: AttachmentType.alert,
      }));

      const attachments = [...userCommentAttachments, ...alertAttachments];

      createCaseFlyout.open({
        attachments,
        headerContent,
      });
    },
    [alertsIndexPattern, createCaseFlyout]
  );

  const headerContent = useMemo(
    () => <div>{i18n.CREATE_A_CASE_FOR_ATTACK_DISCOVERY(title)}</div>,
    [title]
  );

  const onAddToNewCase = useCallback(
    ({
      alertIds,
      markdownComments,
      replacements,
    }: {
      alertIds: string[];
      markdownComments: string[];
      replacements?: Replacements;
    }) => {
      if (onClick) {
        onClick();
      }

      openCreateCaseFlyout({ alertIds, headerContent, markdownComments, replacements });
    },
    [headerContent, onClick, openCreateCaseFlyout]
  );

  return {
    disabled: !canUserCreateAndReadCases(),
    onAddToNewCase,
  };
};
