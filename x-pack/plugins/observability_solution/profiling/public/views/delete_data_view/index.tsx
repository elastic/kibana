/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCard, EuiIcon, EuiLink } from '@elastic/eui';
import React from 'react';
import { useProfilingDependencies } from '../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { ProfilingAppPageTemplate } from '../../components/profiling_app_page_template';

export function DeleteDataView() {
  const {
    start: {
      core: { docLinks },
    },
  } = useProfilingDependencies();

  return (
    <ProfilingAppPageTemplate tabs={[]} restrictWidth hideSearchBar>
      <div style={{ display: 'flex', flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
        <EuiCard
          style={{ flexGrow: 0, maxWidth: '500px' }}
          icon={<EuiIcon color="danger" size="xxl" type="warning" />}
          title="You have existing profiling data"
          description="To proceed with the Universal Profiling setup, please delete existing profiling data following the steps described in the link below."
          footer={
            <div>
              <EuiLink
                data-test-subj="profilingDeleteDataViewDeleteExistingProfilingDataLink"
                href={`${docLinks.ELASTIC_WEBSITE_URL}/guide/en/observability/${docLinks.DOC_LINK_VERSION}/profiling-upgrade.html#profiling-delete-data`}
                target="_blank"
              >
                Delete existing profiling data
              </EuiLink>
            </div>
          }
        />
      </div>
    </ProfilingAppPageTemplate>
  );
}
