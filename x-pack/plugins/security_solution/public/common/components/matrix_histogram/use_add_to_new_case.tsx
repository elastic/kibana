/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { toMountPoint } from '../../../../../../../src/plugins/kibana_react/public';
import { Case, CommentType } from '../../../../../cases/common';
import { CasesDeepLinkId, generateCaseViewPath } from '../../../../../cases/public';
import { APP_ID } from '../../../../common/constants';
import { useKibana } from '../../lib/kibana/kibana_react';

import { LensAttributes } from './types';
import { ADD_TO_CASE_SUCCESS, VIEW_CASE } from './translations';

export interface UseAddToNewCaseProps {
  onClick?: () => void;
  timeRange: { from: string; to: string };
  lensAttributes: LensAttributes | null;
  userCanCrud: boolean;
}

export const HISTOGRAM_ACTIONS_BUTTON_CLASS = 'histogram-actions-trigger';

const owner = APP_ID;
const appId = 'securitySolutionUI';

export const useAddToNewCase = ({
  onClick,
  timeRange,
  lensAttributes,
  userCanCrud,
}: UseAddToNewCaseProps) => {
  const {
    theme,
    application: { getUrlForApp },
    notifications: { toasts },
  } = useKibana().services;

  const [isCreateCaseFlyoutOpen, setIsCreateCaseFlyoutOpen] = useState(false);

  const onAddToNewCaseClicked = useCallback(() => {
    if (onClick) {
      onClick();
    }

    setIsCreateCaseFlyoutOpen(true);
  }, [onClick]);

  const getToastText = useCallback(
    (theCase) =>
      toMountPoint(
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem>
            <EuiLink
              href={getUrlForApp(appId, {
                deepLinkId: CasesDeepLinkId.cases,
                path: generateCaseViewPath({ detailName: theCase.id }),
              })}
              target="_blank"
            >
              {VIEW_CASE}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>,
        { theme$: theme?.theme$ }
      ),
    [getUrlForApp, theme?.theme$]
  );

  const onCreateCaseSuccess = useCallback(
    async (theCase: Case) => {
      setIsCreateCaseFlyoutOpen(false);
      toasts.addSuccess(
        {
          title: ADD_TO_CASE_SUCCESS(theCase.title),
          text: getToastText(theCase),
        },
        {
          toastLifeTimeMs: 10000,
        }
      );
    },
    [getToastText, toasts]
  );

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

  const closeCreateCaseFlyout = useCallback(() => {
    setIsCreateCaseFlyoutOpen(false);
  }, []);

  return {
    onClose: closeCreateCaseFlyout,
    onSuccess: onCreateCaseSuccess,
    attachments,
    onAddToNewCaseClicked,
    isCreateCaseFlyoutOpen,
    disabled: lensAttributes == null || !userCanCrud,
  };
};
