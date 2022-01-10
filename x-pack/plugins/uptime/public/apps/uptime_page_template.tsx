/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { EuiPageHeaderProps, EuiPageTemplateProps } from '@elastic/eui';
import { CERTIFICATES_ROUTE, OVERVIEW_ROUTE } from '../../common/constants';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { ClientPluginsStart } from './plugin';
import { useNoDataConfig } from './use_no_data_config';
import { EmptyStateLoading } from '../components/overview/empty_state/empty_state_loading';
import { EmptyStateError } from '../components/overview/empty_state/empty_state_error';
import { useHasData } from '../components/overview/empty_state/use_has_data';
import { useInspectorContext } from '../../../observability/public';

interface Props {
  path: string;
  pageHeader?: EuiPageHeaderProps;
}

export const UptimePageTemplateComponent: React.FC<Props & EuiPageTemplateProps> = ({
  path,
  pageHeader,
  children,
  ...pageTemplateProps
}) => {
  const {
    services: { observability },
  } = useKibana<ClientPluginsStart>();

  const PageTemplateComponent = observability.navigation.PageTemplate;

  const StyledPageTemplateComponent = useMemo(() => {
    return styled(PageTemplateComponent)`
      .euiPageHeaderContent > .euiFlexGroup {
        flex-wrap: wrap;
      }

      .euiPageHeaderContent > .euiFlexGroup > .euiFlexItem {
        align-items: center;
      }
    `;
  }, [PageTemplateComponent]);

  const noDataConfig = useNoDataConfig();

  const { loading, error, data } = useHasData();
  const { inspectorAdapters } = useInspectorContext();

  useEffect(() => {
    inspectorAdapters.requests.reset();
  }, [inspectorAdapters.requests]);

  if (error) {
    return <EmptyStateError errors={[error]} />;
  }

  const isMainRoute = path === OVERVIEW_ROUTE || path === CERTIFICATES_ROUTE;

  const showLoading = loading && isMainRoute && !data;

  return (
    <>
      <StyledPageTemplateComponent
        pageHeader={pageHeader}
        data-test-subj={noDataConfig ? 'data-missing' : undefined}
        noDataConfig={isMainRoute && !loading ? noDataConfig : undefined}
        {...pageTemplateProps}
      >
        {showLoading && <EmptyStateLoading />}
        <div
          style={{ visibility: showLoading ? 'hidden' : 'initial' }}
          data-test-subj={noDataConfig ? 'data-missing' : undefined}
        >
          {children}
        </div>
      </StyledPageTemplateComponent>
    </>
  );
};
