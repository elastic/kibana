/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

import { useGetCase } from '../../containers/use_get_case';
import * as i18n from './translations';
import { CasesTimelineIntegrationProvider } from '../timeline_context';
import { DoesNotExist } from './does_not_exist';
import { useKibana } from '../../common/lib/kibana';
import { useCasesContext } from '../cases_context/use_cases_context';
import { generateCaseViewPath, useCaseViewParams } from '../../common/navigation';
import { CaseViewPage } from './case_view_page';
import type { CaseViewProps } from './types';

const MyEuiFlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;

export const CaseViewLoading = () => (
  <MyEuiFlexGroup gutterSize="none" justifyContent="center" alignItems="center">
    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner data-test-subj="case-view-loading" size="xl" />
    </EuiFlexItem>
  </MyEuiFlexGroup>
);

export const CaseView = React.memo(
  ({
    onComponentInitialized,
    actionsNavigation,
    ruleDetailsNavigation,
    showAlertDetails,
    timelineIntegration,
    useFetchAlertData,
    refreshRef,
  }: CaseViewProps) => {
    const { spaces: spacesApi } = useKibana().services;
    const { detailName: caseId } = useCaseViewParams();
    const { basePath } = useCasesContext();
    const {
      data,
      resolveOutcome,
      resolveAliasId,
      resolveAliasPurpose,
      isLoading,
      isError,
      fetchCase,
      updateCase,
    } = useGetCase(caseId);

    useEffect(() => {
      if (spacesApi && resolveOutcome === 'aliasMatch' && resolveAliasId != null) {
        const newPath = `${basePath}${generateCaseViewPath({ detailName: resolveAliasId })}`;
        spacesApi.ui.redirectLegacyUrl({
          path: `${newPath}${window.location.search}${window.location.hash}`,
          aliasPurpose: resolveAliasPurpose,
          objectNoun: i18n.CASE,
        });
      }
    }, [resolveOutcome, resolveAliasId, resolveAliasPurpose, basePath, spacesApi]);

    const getLegacyUrlConflictCallout = useCallback(() => {
      // This function returns a callout component *if* we have encountered a "legacy URL conflict" scenario
      if (data && spacesApi && resolveOutcome === 'conflict' && resolveAliasId != null) {
        // We have resolved to one object, but another object has a legacy URL alias associated with this ID/page. We should display a
        // callout with a warning for the user, and provide a way for them to navigate to the other object.
        const otherObjectPath = `${basePath}${generateCaseViewPath({
          detailName: resolveAliasId,
        })}${window.location.search}${window.location.hash}`;

        return spacesApi.ui.components.getLegacyUrlConflict({
          objectNoun: i18n.CASE,
          currentObjectId: data.id,
          otherObjectId: resolveAliasId,
          otherObjectPath,
        });
      }
      return null;
    }, [data, resolveAliasId, resolveOutcome, basePath, spacesApi]);

    return isError ? (
      <DoesNotExist caseId={caseId} />
    ) : isLoading ? (
      <CaseViewLoading />
    ) : (
      data && (
        <CasesTimelineIntegrationProvider timelineIntegration={timelineIntegration}>
          {getLegacyUrlConflictCallout()}
          <CaseViewPage
            caseData={data}
            caseId={caseId}
            fetchCase={fetchCase}
            onComponentInitialized={onComponentInitialized}
            actionsNavigation={actionsNavigation}
            ruleDetailsNavigation={ruleDetailsNavigation}
            showAlertDetails={showAlertDetails}
            updateCase={updateCase}
            useFetchAlertData={useFetchAlertData}
            refreshRef={refreshRef}
          />
        </CasesTimelineIntegrationProvider>
      )
    );
  }
);

CaseViewLoading.displayName = 'CaseViewLoading';
CaseView.displayName = 'CaseView';

// eslint-disable-next-line import/no-default-export
export { CaseView as default };
