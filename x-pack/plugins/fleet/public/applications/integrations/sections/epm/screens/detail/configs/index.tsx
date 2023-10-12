/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiCodeBlock, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { useGetInputsTemplates, useStartServices } from '../../../../../hooks';
import { Loading } from '../../../../../components';

interface ConfigsProps {
  pkgName: string;
  pkgVersion: string;
}

export const Configs: React.FC<ConfigsProps> = ({ pkgName, pkgVersion }) => {
  const [configs, setConfigs] = useState<string | undefined>(undefined);
  const { notifications } = useStartServices();

  const { data, isLoading, error } = useGetInputsTemplates(
    { pkgName, pkgVersion },
    { format: 'yml' }
  );

  useEffect(() => {
    if (isLoading) {
      setConfigs(undefined);
    } else if (!!data) {
      setConfigs(data as string);
    }
  }, [data, isLoading]);

  if (error) {
    notifications.toasts.addError(error, {
      title: i18n.translate('xpack.fleet.epm.errorLoadingChangelog', {
        defaultMessage: 'Error loading changelog information',
      }),
    });
  }

  return isLoading && !configs ? (
    <Loading />
  ) : (
    <EuiFlexGroup data-test-subj="epm.Configs" alignItems="flexStart">
      <EuiFlexItem grow={1} />
      <EuiFlexItem grow={6}>
        <EuiText>
          <p>
            View sample configurations for each of the {pkgName} integration&rsquo;s data streams
            below. Copy/paste this YML into your <code>elastic-agent.yml</code> file or into a file
            within your <code>inputs.d</code> directory.
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiCodeBlock language="yaml" isCopyable={true} paddingSize="s" overflowHeight={1000}>
          {configs}
        </EuiCodeBlock>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
