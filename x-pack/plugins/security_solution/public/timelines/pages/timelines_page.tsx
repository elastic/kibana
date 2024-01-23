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

import { useCreateTimeline } from '../hooks/use_create_timeline';
import { TimelineId } from '../../../common/types/timeline';
import { TimelineType } from '../../../common/api/timeline';
import { HeaderPage } from '../../common/components/header_page';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { useKibana } from '../../common/lib/kibana';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { StatefulOpenTimeline } from '../components/open_timeline';
import * as i18n from './translations';
import { SecurityPageName } from '../../app/types';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { LandingPageComponent } from '../../common/components/landing_page';

const TimelinesContainer = styled.div`
  width: 100%;
`;

export const DEFAULT_SEARCH_RESULTS_PER_PAGE = 10;

export const TimelinesPage = React.memo(() => {
  const { tabName } = useParams<{ pageName: SecurityPageName; tabName: string }>();
  const [importDataModalToggle, setImportDataModalToggle] = useState<boolean>(false);
  const onImportTimelineBtnClick = useCallback(() => {
    setImportDataModalToggle(true);
  }, [setImportDataModalToggle]);
  const { indicesExist } = useSourcererDataView();

  const capabilitiesCanUserCRUD: boolean =
    !!useKibana().services.application.capabilities.siem.crud;

  const createNewTimeline = useCreateTimeline({
    timelineId: TimelineId.active,
    timelineType: TimelineType.default,
  });
  const createNewTimelineTemplate = useCreateTimeline({
    timelineId: TimelineId.active,
    timelineType: TimelineType.template,
  });

  return (
    <>
      {indicesExist ? (
        <SecuritySolutionPageWrapper>
          <HeaderPage title={i18n.PAGE_TITLE}>
            {capabilitiesCanUserCRUD && (
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem>
                  <EuiButton
                    iconType="indexOpen"
                    onClick={onImportTimelineBtnClick}
                    data-test-subj="timelines-page-open-import-data"
                  >
                    {i18n.ALL_TIMELINES_IMPORT_TIMELINE_TITLE}
                  </EuiButton>
                </EuiFlexItem>
                {tabName === TimelineType.default ? (
                  <EuiFlexItem>
                    <EuiButton
                      iconType="plusInCircle"
                      fill
                      data-test-subj="timelines-page-create-new-timeline"
                      onClick={() => createNewTimeline()}
                    >
                      {i18n.NEW_TIMELINE}
                    </EuiButton>
                  </EuiFlexItem>
                ) : (
                  <EuiFlexItem>
                    <EuiButton
                      iconType="plusInCircle"
                      fill
                      data-test-subj="timelines-page-create-new-timeline-timeline"
                      onClick={() => createNewTimelineTemplate()}
                    >
                      {i18n.NEW_TEMPLATE_TIMELINE}
                    </EuiButton>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            )}
          </HeaderPage>

          <TimelinesContainer>
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
      ) : (
        <LandingPageComponent />
      )}

      <SpyRoute pageName={SecurityPageName.timelines} />
    </>
  );
});

TimelinesPage.displayName = 'TimelinesPage';
