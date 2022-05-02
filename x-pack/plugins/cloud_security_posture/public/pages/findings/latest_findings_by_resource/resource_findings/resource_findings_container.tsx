/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer, EuiButtonEmpty } from '@elastic/eui';
import type { DataView } from '@kbn/data-plugin/common';
import { Link, useParams } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { useEuiTheme } from '@elastic/eui';
import { generatePath } from 'react-router-dom';
import * as TEST_SUBJECTS from '../../test_subjects';
import { PageWrapper, PageTitle, PageTitleText } from '../../layout/findings_layout';
import { useCspBreadcrumbs } from '../../../../common/navigation/use_csp_breadcrumbs';
import { findingsNavigation } from '../../../../common/navigation/constants';

const BackToResourcesButton = () => {
  return (
    <Link to={generatePath(findingsNavigation.findings_by_resource.path)}>
      <EuiButtonEmpty iconType={'arrowLeft'}>
        <FormattedMessage
          id="xpack.csp.findings.resourceFindings.backToResourcesPageButtonLabel"
          defaultMessage=" Back to group by resource view"
        />
        Back to group by resource view
      </EuiButtonEmpty>
    </Link>
  );
};

export const ResourceFindings = ({ dataView }: { dataView: DataView }) => {
  useCspBreadcrumbs([findingsNavigation.findings_default]);
  const { euiTheme } = useEuiTheme();
  const params = useParams<{ resourceId: string }>();

  return (
    <div data-test-subj={TEST_SUBJECTS.FINDINGS_CONTAINER}>
      <PageWrapper>
        <PageTitle>
          <BackToResourcesButton />
          <PageTitleText
            title={
              <div style={{ padding: euiTheme.size.s }}>
                <FormattedMessage
                  id="xpack.csp.findings.resourceFindingsTitle"
                  defaultMessage="{resourceId} - Findings"
                  values={{ resourceId: params.resourceId }}
                />
              </div>
            }
          />
        </PageTitle>
        <EuiSpacer />
      </PageWrapper>
    </div>
  );
};
