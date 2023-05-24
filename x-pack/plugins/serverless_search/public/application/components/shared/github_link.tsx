/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiLink } from '@elastic/eui';
import React from 'react';
import { PLUGIN_ID } from '../../../../common';
import { useKibanaServices } from '../../hooks/use_kibana';

export const GithubLink: React.FC<{ label: string; href: string }> = ({ label, href }) => {
  const { http } = useKibanaServices();
  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs" justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiIcon size="s" type={http.basePath.prepend(`/plugins/${PLUGIN_ID}/assets/github.svg`)} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <EuiLink target="_blank" href={href}>
            {label}
          </EuiLink>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
