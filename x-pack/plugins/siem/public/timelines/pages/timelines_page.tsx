/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import ApolloClient from 'apollo-client';
import React, { useCallback, useState } from 'react';
import styled from 'styled-components';

import { HeaderPage } from '../../common/components/header_page';
import { WrapperPage } from '../../common/components/wrapper_page';
import { useKibana } from '../../common/lib/kibana';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { StatefulOpenTimeline, disableTemplate } from '../components/open_timeline';
import * as i18n from './translations';
import {
  NEW_TIMELINE,
  NEW_TEMPLATE_TIMELINE,
} from '../components/timeline/properties/translations';
import { CreateTimelineBtn } from '../components/timeline/properties/create_timeline_btn';
import { TimelineType } from '../../../common/types/timeline';
const TimelinesContainer = styled.div`
  width: 100%;
`;

interface TimelinesProps<TCache = object> {
  apolloClient: ApolloClient<TCache>;
}

type OwnProps = TimelinesProps;

export const DEFAULT_SEARCH_RESULTS_PER_PAGE = 10;

export const TimelinesPageComponent: React.FC<OwnProps> = ({ apolloClient }) => {
  const [importDataModalToggle, setImportDataModalToggle] = useState<boolean>(false);
  const onImportTimelineBtnClick = useCallback(() => {
    setImportDataModalToggle(true);
  }, [setImportDataModalToggle]);

  const uiCapabilities = useKibana().services.application.capabilities;
  const capabilitiesCanUserCRUD: boolean =
    typeof uiCapabilities.siem.crud === 'boolean' ? uiCapabilities.siem.crud : false;

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
                  fill
                >
                  {i18n.ALL_TIMELINES_IMPORT_TIMELINE_TITLE}
                </EuiButton>
              )}
            </EuiFlexItem>
            <EuiFlexItem>
              {capabilitiesCanUserCRUD && (
                <CreateTimelineBtn
                  outline={true}
                  timelineType={TimelineType.default}
                  title={NEW_TIMELINE}
                  data-test-subj="create-default-btn"
                />
              )}
            </EuiFlexItem>
            {/**
             * CreateTemplateTimelineBtn
             * Remove the comment here to enable CreateTemplateTimelineBtn
             */}
            {!disableTemplate && capabilitiesCanUserCRUD && (
              <EuiFlexItem>
                <CreateTimelineBtn
                  outline={true}
                  timelineType={TimelineType.template}
                  title={NEW_TEMPLATE_TIMELINE}
                  data-test-subj="create-template-btn"
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </HeaderPage>

        <TimelinesContainer>
          <StatefulOpenTimeline
            apolloClient={apolloClient}
            defaultPageSize={DEFAULT_SEARCH_RESULTS_PER_PAGE}
            isModal={false}
            importDataModalToggle={importDataModalToggle && capabilitiesCanUserCRUD}
            setImportDataModalToggle={setImportDataModalToggle}
            title={i18n.ALL_TIMELINES_PANEL_TITLE}
            data-test-subj="stateful-open-timeline"
          />
        </TimelinesContainer>
      </WrapperPage>

      <SpyRoute />
    </>
  );
};

export const TimelinesPage = React.memo(TimelinesPageComponent);
