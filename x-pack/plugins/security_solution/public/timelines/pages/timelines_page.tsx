/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { useParams } from 'react-router-dom';

import { TimelineType } from '../../../common/types/timeline';
import { HeaderPage } from '../../common/components/header_page';
import { WrapperPage } from '../../common/components/wrapper_page';
import { useKibana } from '../../common/lib/kibana';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useApolloClient } from '../../common/utils/apollo_context';

import { StatefulOpenTimeline } from '../components/open_timeline';
import { NEW_TEMPLATE_TIMELINE } from '../components/timeline/properties/translations';
import { NewTemplateTimeline } from '../components/timeline/properties/new_template_timeline';
import { NewTimeline } from '../components/timeline/properties/helpers';

import * as i18n from './translations';
import { SecurityPageName } from '../../app/types';

const TimelinesContainer = styled.div`
  width: 100%;
`;

export const DEFAULT_SEARCH_RESULTS_PER_PAGE = 10;

export const TimelinesPageComponent: React.FC = () => {
  const { tabName } = useParams();
  const [importDataModalToggle, setImportDataModalToggle] = useState<boolean>(false);
  const onImportTimelineBtnClick = useCallback(() => {
    setImportDataModalToggle(true);
  }, [setImportDataModalToggle]);

  const apolloClient = useApolloClient();
  const uiCapabilities = useKibana().services.application.capabilities;
  const capabilitiesCanUserCRUD: boolean = !!uiCapabilities.siem.crud;

  return (
    <>
      <WrapperPage>
        <HeaderPage border title={i18n.PAGE_TITLE}>
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
                {capabilitiesCanUserCRUD && (
                  <NewTimeline
                    timelineId="timeline-1"
                    outline={true}
                    data-test-subj="create-default-btn"
                  />
                )}
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

        <TimelinesContainer>
          <StatefulOpenTimeline
            apolloClient={apolloClient!}
            defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
            isModal={false}
            importDataModalToggle={importDataModalToggle && capabilitiesCanUserCRUD}
            setImportDataModalToggle={setImportDataModalToggle}
            title={i18n.ALL_TIMELINES_PANEL_TITLE}
            data-test-subj="stateful-open-timeline"
          />
        </TimelinesContainer>
      </WrapperPage>

      <SpyRoute pageName={SecurityPageName.timelines} />
    </>
  );
};

export const TimelinesPage = React.memo(TimelinesPageComponent);
