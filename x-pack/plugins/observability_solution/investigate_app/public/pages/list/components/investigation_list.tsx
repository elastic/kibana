/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useFetchInvestigationList } from '../../../hooks/use_fetch_investigation_list';
import { useKibana } from '../../../hooks/use_kibana';
import { paths } from '../../../../common/paths';

export function InvestigationList() {
  const {
    core: {
      http: { basePath },
    },
  } = useKibana();
  const { data, isLoading, isError } = useFetchInvestigationList();

  if (isLoading) {
    return (
      <h1>
        {i18n.translate('xpack.investigateApp.investigationList.loadingLabel', {
          defaultMessage: 'Loading...',
        })}
      </h1>
    );
  }

  if (isError) {
    return (
      <h1>
        {i18n.translate('xpack.investigateApp.investigationList.errorLabel', {
          defaultMessage: 'Error while loading investigations',
        })}
      </h1>
    );
  }

  const investigations = data?.results ?? [];

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <ul>
          {investigations.map((investigation) => (
            <li key={investigation.id}>
              <EuiLink
                data-test-subj="investigateAppInvestigationListLink"
                href={basePath.prepend(paths.investigationDetails(investigation.id))}
              >
                {investigation.title}
              </EuiLink>
            </li>
          ))}
        </ul>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
