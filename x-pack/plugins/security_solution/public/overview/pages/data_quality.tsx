/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';

import { SecurityPageName } from '../../app/types';
import { DataQualityPanel } from '../components/data_quality';
import { ECS_REFERENCE_URL } from '../components/data_quality/data_quality_panel/index_properties/markdown/helpers';
import { DATA_QUALITY_SUBTITLE } from '../components/data_quality/translations';
import { HeaderPage } from '../../common/components/header_page';
import { LandingPageComponent } from '../../common/components/landing_page';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SiemSearchBar } from '../../common/components/search_bar';
import { SECURITY_DEFAULT_DATA_VIEW_LABEL } from '../../common/components/sourcerer/translations';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { InputsModelId } from '../../common/store/inputs/constants';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useSignalIndex } from '../../detections/containers/detection_engine/alerts/use_signal_index';
import * as i18n from './translations';

const DataQualityComponent: React.FC = () => {
  const {
    indicesExist,
    indexPattern,
    loading: isSourcererLoading,
    selectedPatterns,
  } = useSourcererDataView();
  const { signalIndexName } = useSignalIndex();
  const alertsAndSelectedPatterns = useMemo(
    () => [`${signalIndexName}`, ...selectedPatterns],
    [selectedPatterns, signalIndexName]
  );

  const subtitle = useMemo(
    () => (
      <EuiText color="subdued" size="s">
        <span>{DATA_QUALITY_SUBTITLE}</span>{' '}
        <EuiLink external={true} href={ECS_REFERENCE_URL} rel="noopener noreferrer" target="_blank">
          {i18n.ELASTIC_COMMON_SCHEMA}
        </EuiLink>
      </EuiText>
    ),
    []
  );

  return (
    <>
      {indicesExist ? (
        <>
          <SecuritySolutionPageWrapper data-test-subj="dataQualityPage">
            <HeaderPage subtitle={subtitle} title={i18n.DATA_QUALITY_TITLE}>
              <SiemSearchBar
                id={InputsModelId.global}
                indexPattern={indexPattern}
                hideFilterBar
                hideQueryInput
              />
            </HeaderPage>

            {isSourcererLoading ? (
              <EuiLoadingSpinner size="l" data-test-subj="dataQualityLoader" />
            ) : (
              <EuiFlexGroup direction="column" data-test-subj="dataQualitySections">
                <EuiFlexItem>
                  <DataQualityPanel
                    patterns={alertsAndSelectedPatterns}
                    title={SECURITY_DEFAULT_DATA_VIEW_LABEL}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </SecuritySolutionPageWrapper>
        </>
      ) : (
        <LandingPageComponent />
      )}

      <SpyRoute pageName={SecurityPageName.detectionAndResponse} />
    </>
  );
};

DataQualityComponent.displayName = 'DataQualityComponent';

export const DataQuality = React.memo(DataQualityComponent);
