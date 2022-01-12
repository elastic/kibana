/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { useParams } from 'react-router-dom';

import { TimelineId, TimelineType } from '../../../common/types/timeline';
import { HeaderPage } from '../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { useKibana } from '../../common/lib/kibana';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { OverviewEmpty } from '../../overview/components/overview_empty';
import { StatefulOpenTimeline } from '../components/open_timeline';
import { NEW_TEMPLATE_TIMELINE } from '../components/timeline/properties/translations';
import { NewTemplateTimeline } from '../components/timeline/properties/new_template_timeline';
import { NewTimeline } from '../components/timeline/properties/helpers';
import * as i18n from './translations';
import { SecurityPageName } from '../../app/types';
import { useSourcererDataView } from '../../common/containers/sourcerer';

const TimelinesContainer = styled.div`
  width: 100%;
`;

export const DEFAULT_SEARCH_RESULTS_PER_PAGE = 10;

export const TimelinesPageComponent: React.FC = () => {
  const { tabName } = useParams<{ pageName: SecurityPageName; tabName: string }>();
  const [importDataModalToggle, setImportDataModalToggle] = useState<boolean>(false);
  const onImportTimelineBtnClick = useCallback(() => {
    setImportDataModalToggle(true);
  }, [setImportDataModalToggle]);
  const { indicesExist } = useSourcererDataView();

  const capabilitiesCanUserCRUD: boolean =
    !!useKibana().services.application.capabilities.siem.crud;

  return (
    <>
      {indicesExist ? (
        <>
          <SecuritySolutionPageWrapper>
            <HeaderPage title={i18n.PAGE_TITLE}>
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem>
                  {capabilitiesCanUserCRUD && (
                    <EuiButton
                      iconType="indexOpen"
                      onClick={onImportTimelineBtnClick}
                      data-test-subj="open-import-data-modal-btn"
                    >
                      {i18n.ALL_TIMELINES_IMPORT_TIMELINE_TITLE}
                    </EuiButton>
                  )}
                </EuiFlexItem>
                {tabName === TimelineType.default ? (
                  <EuiFlexItem>
                    <NewTimeline
                      timelineId={TimelineId.active}
                      outline={true}
                      data-test-subj="create-default-btn"
                    />
                  </EuiFlexItem>
                ) : (
                  <EuiFlexItem>
                    <NewTemplateTimeline
                      outline={true}
                      title={NEW_TEMPLATE_TIMELINE}
                      data-test-subj="create-template-btn"
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </HeaderPage>

            <TimelinesContainer data-test-subj="timelines-container">
              <StatefulOpenTimeline
                defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
                isModal={false}
                importDataModalToggle={importDataModalToggle && capabilitiesCanUserCRUD}
                setImportDataModalToggle={setImportDataModalToggle}
                title={i18n.ALL_TIMELINES_PANEL_TITLE}
                data-test-subj="stateful-open-timeline"
              />
            </TimelinesContainer>
          </SecuritySolutionPageWrapper>
        </>
      ) : (
        <SecuritySolutionPageWrapper>
          <OverviewEmpty />
        </SecuritySolutionPageWrapper>
      )}

      <SpyRoute pageName={SecurityPageName.timelines} />
    </>
  );
};

export const TimelinesPage = React.memo(TimelinesPageComponent);
