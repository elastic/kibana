/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { HttpSetup } from 'kibana/public';
import { toMountPoint, useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { ObservabilityAppServices } from '../../../../application/types';
import { AllCasesSelectorModalProps } from '../../../../../../cases/public';
import { TypedLensByValueInput } from '../../../../../../lens/public';
import { Case, SubCase } from '../../../../../../cases/common';

interface Props {
  timeRange: { from: string; to: string };
  lensAttributes: TypedLensByValueInput['attributes'] | null;
}

async function addToCase(
  http: HttpSetup,
  theCase: Case | SubCase,
  attributes: TypedLensByValueInput['attributes'],
  timeRange: { from: string; to: string }
) {
  const apiPath = `/api/cases/${theCase?.id}/comments`;

  const vizPayload = {
    attributes,
    timeRange,
  };

  const payload = {
    comment: `!{lens${JSON.stringify(vizPayload)}}`,
    type: 'user',
    owner: 'observability',
  };

  return http.post(apiPath, { body: JSON.stringify(payload) });
}

export function AddToCaseAction({ lensAttributes, timeRange }: Props) {
  const kServices = useKibana<ObservabilityAppServices>().services;

  const { cases, http, notifications } = kServices;
  const [isCasesOpen, setIsCasesOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const getAllCasesSelectorModalProps: AllCasesSelectorModalProps = {
    createCaseNavigation: {
      href: '',
      onClick: () => {},
    },
    onRowClick: (theCase) => {
      setIsCasesOpen(false);
      if (theCase && lensAttributes) {
        setIsSaving(true);
        addToCase(http, theCase, lensAttributes, timeRange).then(() => {
          setIsSaving(false);
          notifications.toasts.addSuccess(
            {
              title: i18n.translate('xpack.observability.expView.heading.addToCase.notification', {
                defaultMessage: 'Successfully added visualization to the case: {caseTitle}',
                values: { caseTitle: theCase.title },
              }),
              text: toMountPoint(
                <EuiFlexGroup justifyContent="center">
                  <EuiFlexItem>
                    <EuiLink
                      href={`${http.basePath.get()}/app/observability/cases/${theCase.id}`}
                      target="_blank"
                    >
                      {i18n.translate(
                        'xpack.observability.expView.heading.addToCase.notification.viewCase',
                        {
                          defaultMessage: 'View case',
                        }
                      )}
                    </EuiLink>
                  </EuiFlexItem>
                </EuiFlexGroup>
              ),
            },
            {
              toastLifeTimeMs: 10000,
            }
          );
        });
      }
    },
    userCanCrud: true,
    owner: ['observability'],
  };

  return (
    <>
      <EuiButton
        isLoading={isSaving}
        fullWidth={false}
        isDisabled={lensAttributes === null}
        onClick={() => {
          if (lensAttributes) {
            setIsCasesOpen(true);
          }
        }}
      >
        {i18n.translate('xpack.observability.expView.heading.addToCase', {
          defaultMessage: 'Add to case',
        })}
      </EuiButton>
      {isCasesOpen &&
        lensAttributes &&
        cases.getAllCasesSelectorModal(getAllCasesSelectorModalProps)}
    </>
  );
}
