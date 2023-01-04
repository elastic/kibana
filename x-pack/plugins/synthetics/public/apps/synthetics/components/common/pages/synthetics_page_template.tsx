/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiPageHeaderProps, EuiPageTemplateProps } from '@elastic/eui';
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

export const SyntheticsPageTemplateComponent: React.FC<Props & EuiPageTemplateProps> = ({
  path,
  pageHeader,
  children,
  ...pageTemplateProps
}) => {
  const {
    services: { observability },
  } = useKibana<ClientPluginsStart>();

  const PageTemplateComponent = observability.navigation.PageTemplate;

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
      <PageTemplateComponent
        pageHeader={pageHeader}
        data-test-subj={'synthetics-page-template'}
        isPageDataLoaded={loading === false}
        {...pageTemplateProps}
      >
        {showLoading && <EmptyStateLoading />}
        <div style={{ visibility: showLoading ? 'hidden' : 'initial' }}>{children}</div>
      </PageTemplateComponent>
    </>
  );
};
