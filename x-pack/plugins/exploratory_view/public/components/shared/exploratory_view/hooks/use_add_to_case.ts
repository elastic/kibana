/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { HttpSetup, MountPoint } from '@kbn/core/public';
import { CaseUI, AttachmentType } from '@kbn/cases-plugin/common';
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { CasesDeepLinkId, DRAFT_COMMENT_STORAGE_ID } from '@kbn/cases-plugin/public';
import { observabilityFeatureId } from '@kbn/observability-shared-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { LENS_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import { ObservabilityAppServices } from '../../../../application/types';
import { AddToCaseProps } from '../header/add_to_case_action';

async function addToCase(
  http: HttpSetup,
  theCase: CaseUI,
  attributes: TypedLensByValueInput['attributes'],
  timeRange?: { from: string; to: string },
  owner?: string
) {
  const apiPath = `/api/cases/${theCase?.id}/comments`;

  const payload = {
    persistableStateAttachmentState: { attributes, timeRange },
    persistableStateAttachmentTypeId: LENS_ATTACHMENT_TYPE,
    type: AttachmentType.persistableState,
    owner: owner ?? observabilityFeatureId,
  };

  return http.post(apiPath, { body: JSON.stringify(payload) });
}

export const useAddToCase = ({
  lensAttributes,
  getToastText,
  timeRange,
  appId,
  owner = observabilityFeatureId,
}: AddToCaseProps & {
  appId?: 'securitySolutionUI' | 'observability';
  getToastText: (thaCase: CaseUI) => MountPoint<HTMLElement>;
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isCasesOpen, setIsCasesOpen] = useState(false);

  const {
    http,
    application: { navigateToApp },
    notifications: { toasts },
    storage,
  } = useKibana<ObservabilityAppServices>().services;

  const onCaseClicked = useCallback(
    (theCase?: CaseUI) => {
      if (theCase && lensAttributes) {
        setIsCasesOpen(false);
        setIsSaving(true);
        addToCase(http, theCase, lensAttributes, timeRange, owner).then(
          () => {
            setIsSaving(false);
            toasts.addSuccess(
              {
                title: i18n.translate(
                  'xpack.exploratoryView.expView.heading.addToCase.notification',
                  {
                    defaultMessage: 'Successfully added visualization to the case: {caseTitle}',
                    values: { caseTitle: theCase.title },
                  }
                ),
                text: getToastText(theCase),
              },
              {
                toastLifeTimeMs: 10000,
              }
            );
          },
          (error) => {
            toasts.addError(error, {
              title: i18n.translate(
                'xpack.exploratoryView.expView.heading.addToCase.notification.error',
                {
                  defaultMessage: 'Failed to add visualization to the selected case.',
                }
              ),
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
        navigateToApp(appId ?? observabilityFeatureId, {
          deepLinkId: CasesDeepLinkId.casesCreate,
          openInNewTab: true,
        });
      }
    },
    [appId, getToastText, http, lensAttributes, navigateToApp, owner, storage, timeRange, toasts]
  );

  return {
    onCaseClicked,
    isSaving,
    isCasesOpen,
    setIsCasesOpen,
  };
};
