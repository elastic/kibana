/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { EuiPageHeaderProps, EuiPageTemplateProps, useIsWithinMaxBreakpoint } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useInspectorContext } from '@kbn/observability-plugin/public';
import { useSyntheticsDataView } from '../../../contexts';
import { ClientPluginsStart } from '../../../../../plugin';
import { EmptyStateLoading } from '../../monitors_page/overview/empty_state/empty_state_loading';
import { EmptyStateError } from '../../monitors_page/overview/empty_state/empty_state_error';

interface Props {
  path: string;
  pageHeader?: EuiPageHeaderProps;
}

const mobileCenteredHeader = `
  .euiPageHeaderContent > .euiFlexGroup > .euiFlexItem {
    align-items: center;
  }
`;

export const SyntheticsPageTemplateComponent: React.FC<Props & EuiPageTemplateProps> = ({
  path,
  pageHeader,
  children,
  ...pageTemplateProps
}) => {
  const {
    services: { observability },
  } = useKibana<ClientPluginsStart>();
  const isMobile = useIsWithinMaxBreakpoint('s');

  const PageTemplateComponent = observability.navigation.PageTemplate;
  const StyledPageTemplateComponent = useMemo(() => {
    return styled(PageTemplateComponent)<{ isMobile: boolean }>`
      .euiPageHeaderContent > .euiFlexGroup {
        flex-wrap: wrap;
      }

      ${(props) => (props.isMobile ? mobileCenteredHeader : '')}
    `;
  }, [PageTemplateComponent]);

  const { loading, error, hasData } = useSyntheticsDataView();
  const { inspectorAdapters } = useInspectorContext();

  useEffect(() => {
    inspectorAdapters.requests.reset();
  }, [inspectorAdapters.requests]);

  if (error) {
    return <EmptyStateError errors={[error]} />;
  }

  const showLoading = loading && !hasData;

  return (
    <>
      <StyledPageTemplateComponent
        isMobile={isMobile}
        pageHeader={pageHeader}
        data-test-subj={'synthetics-page-template'}
        isPageDataLoaded={loading === false}
        {...pageTemplateProps}
      >
        {showLoading && <EmptyStateLoading />}
        <div style={{ visibility: showLoading ? 'hidden' : 'initial' }}>{children}</div>
      </StyledPageTemplateComponent>
    </>
  );
};
