/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ApolloClient from 'apollo-client';
import React, { useState, useCallback } from 'react';
import styled from 'styled-components';

import { EuiButton } from '@elastic/eui';
import { HeaderPage } from '../../components/header_page';
import { StatefulOpenTimeline } from '../../components/open_timeline';
import { WrapperPage } from '../../components/wrapper_page';
import { SpyRoute } from '../../utils/route/spy_routes';
import * as i18n from './translations';
import { useKibana } from '../../lib/kibana';

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
          {capabilitiesCanUserCRUD && (
            <EuiButton
              iconType="indexOpen"
              onClick={onImportTimelineBtnClick}
              data-test-subj="open-import-data-modal-btn"
            >
              {i18n.ALL_TIMELINES_IMPORT_TIMELINE_TITLE}
            </EuiButton>
          )}
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
