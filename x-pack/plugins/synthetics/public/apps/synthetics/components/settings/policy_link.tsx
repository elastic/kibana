/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiLoadingContent } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ILM_LOCATOR_ID } from '@kbn/index-lifecycle-management-plugin/public';
import { useFetcher } from '@kbn/observability-plugin/public';
import { useSyntheticsSettingsContext } from '../../contexts';
import { ClientPluginsStart } from '../../../../plugin';

export const PolicyLink = ({ name }: { name: string }) => {
  const { share } = useKibana<ClientPluginsStart>().services;

  const ilmLocator = share.url.locators.get(ILM_LOCATOR_ID);

  const { basePath } = useSyntheticsSettingsContext();

  const { data } = useFetcher(async () => {
    return ilmLocator?.getLocation({ page: 'policy_edit', policyName: name });
  }, [name]);

  if (!data) {
    return <EuiLoadingContent lines={1} />;
  }

  return (
    <EuiLink
      href={`${basePath}/app/${data.app}${data.path}`}
      target="_blank"
      data-test-subj={name + 'PolicyLink'}
    >
      {name}
    </EuiLink>
  );
};
