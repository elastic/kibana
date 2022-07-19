/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect } from 'react';
import { toMountPoint, useKibana } from '@kbn/kibana-react-plugin/public';
import {
  CasesDeepLinkId,
  generateCaseViewPath,
  GetAllCasesSelectorModalProps,
} from '@kbn/cases-plugin/public';
import { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { useGetUserCasesPermissions } from '../../../../hooks/use_get_user_cases_permissions';
import { ObservabilityAppServices } from '../../../../application/types';
import { useAddToCase } from '../hooks/use_add_to_case';
import { observabilityFeatureId, observabilityAppId } from '../../../../../common';
import { parseRelativeDate } from '../components/date_range_picker';

export interface AddToCaseProps {
  appId?: 'securitySolutionUI' | 'observability';
  autoOpen?: boolean;
  lensAttributes: TypedLensByValueInput['attributes'] | null;
  owner?: string;
  setAutoOpen?: (val: boolean) => void;
  timeRange: { from: string; to: string };
}

export function AddToCaseAction({
  appId,
  autoOpen,
  lensAttributes,
  owner = observabilityFeatureId,
  setAutoOpen,
  timeRange,
}: AddToCaseProps) {
  const kServices = useKibana<ObservabilityAppServices>().services;
  const userCasesPermissions = useGetUserCasesPermissions();

  const {
    cases,
    application: { getUrlForApp },
    theme,
  } = kServices;

  const getToastText = useCallback(
    (theCase) =>
      toMountPoint(
        <CaseToastText
          linkUrl={getUrlForApp(appId ?? observabilityAppId, {
            deepLinkId: CasesDeepLinkId.cases,
            path: generateCaseViewPath({ detailName: theCase.id }),
          })}
        />,
        { theme$: theme?.theme$ }
      ),
    [appId, getUrlForApp, theme?.theme$]
  );

  const absoluteFromDate = parseRelativeDate(timeRange.from);
  const absoluteToDate = parseRelativeDate(timeRange.to, { roundUp: true });

  const { onCaseClicked, isCasesOpen, setIsCasesOpen, isSaving } = useAddToCase({
    lensAttributes,
    getToastText,
    timeRange: {
      from: absoluteFromDate?.toISOString() ?? '',
      to: absoluteToDate?.toISOString() ?? '',
    },
    appId,
    owner,
  });

  const getAllCasesSelectorModalProps: GetAllCasesSelectorModalProps = {
    permissions: userCasesPermissions,
    onRowClick: onCaseClicked,
    owner: [owner],
    onClose: () => {
      setIsCasesOpen(false);
    },
  };

  useEffect(() => {
    if (autoOpen) {
      setIsCasesOpen(true);
    }
  }, [autoOpen, setIsCasesOpen]);

  useEffect(() => {
    if (!isCasesOpen) {
      setAutoOpen?.(false);
    }
  }, [isCasesOpen, setAutoOpen]);

  return (
    <>
      {typeof autoOpen === 'undefined' && (
        <EuiButtonEmpty
          size="s"
          isLoading={isSaving}
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
        </EuiButtonEmpty>
      )}
      {isCasesOpen &&
        lensAttributes &&
        cases.ui.getAllCasesSelectorModal(getAllCasesSelectorModalProps)}
    </>
  );
}

export function CaseToastText({ linkUrl }: { linkUrl: string }) {
  return (
    <EuiFlexGroup justifyContent="center">
      <EuiFlexItem>
        <EuiLink href={linkUrl} target="_blank">
          {i18n.translate('xpack.observability.expView.heading.addToCase.notification.viewCase', {
            defaultMessage: 'View case',
          })}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
