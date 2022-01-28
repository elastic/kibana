/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { HttpSetup, MountPoint } from 'kibana/public';
import { useKibana } from '../../../../utils/kibana_react';
import { Case, SubCase } from '../../../../../../cases/common';
import { TypedLensByValueInput } from '../../../../../../lens/public';
import { AddToCaseProps } from '../header/add_to_case_action';
import { observabilityFeatureId } from '../../../../../common';
import { CasesDeepLinkId } from '../../../../../../cases/public';

async function addToCase(
  http: HttpSetup,
  theCase: Case | SubCase,
  attributes: TypedLensByValueInput['attributes'],
  timeRange?: { from: string; to: string }
) {
  const apiPath = `/api/cases/${theCase?.id}/comments`;

  const vizPayload = {
    attributes,
    timeRange,
  };

  const payload = {
    comment: `!{lens${JSON.stringify(vizPayload)}}`,
    type: 'user',
    owner: observabilityFeatureId,
  };

  return http.post(apiPath, { body: JSON.stringify(payload) });
}

export const useAddToCase = ({
  lensAttributes,
  getToastText,
  timeRange,
  appId,
}: AddToCaseProps & {
  appId?: 'security' | 'observability';
  getToastText: (thaCase: Case | SubCase) => MountPoint<HTMLElement>;
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isCasesOpen, setIsCasesOpen] = useState(false);

  const {
    http,
    application: { navigateToApp },
    notifications: { toasts },
  } = useKibana().services;

  const onCaseClicked = useCallback(
    (theCase?: Case | SubCase) => {
      if (theCase && lensAttributes) {
        setIsCasesOpen(false);
        setIsSaving(true);
        addToCase(http, theCase, lensAttributes, timeRange).then(
          () => {
            setIsSaving(false);
            toasts.addSuccess(
              {
                title: i18n.translate(
                  'xpack.observability.expView.heading.addToCase.notification',
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
                'xpack.observability.expView.heading.addToCase.notification.error',
                {
                  defaultMessage: 'Failed to add visualization to the selected case.',
                }
              ),
            });
          }
        );
      } else {
        navigateToApp(appId || observabilityFeatureId, {
          deepLinkId: CasesDeepLinkId.casesCreate,
          openInNewTab: true,
        });
      }
    },
    [appId, getToastText, http, lensAttributes, navigateToApp, timeRange, toasts]
  );

  return {
    onCaseClicked,
    isSaving,
    isCasesOpen,
    setIsCasesOpen,
  };
};
