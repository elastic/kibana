/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';
import { toMountPoint } from '../../../../../../../src/plugins/kibana_react/public';
import { Case } from '../../../../../cases/common';
import {
  CasesDeepLinkId,
  DRAFT_COMMENT_STORAGE_ID,
  generateCaseViewPath,
} from '../../../../../cases/public';
import { APP_ID } from '../../../../common/constants';
import { useKibana } from '../../lib/kibana/kibana_react';
import { ADD_TO_CASE_FAILURE, ADD_TO_CASE_SUCCESS } from './translations';

import { LensAttributes } from './types';
import { addToCase } from './utils';
import { ToastText } from './toast_text';

const appId = 'securitySolutionUI';
const owner = APP_ID;

export const useAddToExistingCase = ({
  onAddToCaseClicked,
  lensAttributes,
  timeRange,
  userCanCrud,
}: {
  onAddToCaseClicked?: () => void;
  lensAttributes: LensAttributes | null;
  timeRange: { from: string; to: string };
  userCanCrud: boolean;
}) => {
  const {
    application: { getUrlForApp, navigateToApp },
    http,
    notifications: { toasts },
    storage,
    theme,
  } = useKibana().services;
  const [isAllCaseModalOpen, setIsAllCaseModalOpen] = useState(false);

  const closeAllCaseModal = useCallback(() => {
    setIsAllCaseModalOpen(false);
  }, []);

  const onAddToExistingCaseClicked = useCallback(() => {
    if (onAddToCaseClicked) {
      onAddToCaseClicked();
    }
    setIsAllCaseModalOpen(true);
  }, [onAddToCaseClicked]);

  const getToastText = useCallback(
    (theCase: Case) =>
      toMountPoint(
        <ToastText
          caseId={theCase.id}
          href={getUrlForApp(appId, {
            deepLinkId: CasesDeepLinkId.cases,
            path: generateCaseViewPath({ detailName: theCase.id }),
          })}
        />,
        { theme$: theme?.theme$ }
      ),
    [getUrlForApp, theme?.theme$]
  );

  const onCaseClicked = useCallback(
    (theCase?: Case) => {
      if (theCase && lensAttributes) {
        setIsAllCaseModalOpen(false);
        addToCase(http, theCase, lensAttributes, timeRange, owner).then(
          () => {
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
          (error) => {
            toasts.addError(error, {
              title: ADD_TO_CASE_FAILURE,
            });
          }
        );
      } else {
        /* save lens attributes and timerange to local storage,
         ** so the description field will be automatically filled on case creation page.
         */
        storage?.set(DRAFT_COMMENT_STORAGE_ID, {
          commentId: 'description',
          comment: `!{lens${JSON.stringify({
            timeRange,
            attributes: lensAttributes,
          })}}`,
          position: '',
          caseTitle: '',
          caseTags: '',
        });
        navigateToApp(appId, {
          deepLinkId: CasesDeepLinkId.casesCreate,
          openInNewTab: true,
        });
      }
    },
    [getToastText, http, lensAttributes, navigateToApp, storage, timeRange, toasts]
  );

  return {
    closeAllCaseModal,
    isAllCaseModalOpen,
    onCaseClicked,
    onAddToExistingCaseClicked,
    disabled: lensAttributes == null || !userCanCrud,
  };
};
