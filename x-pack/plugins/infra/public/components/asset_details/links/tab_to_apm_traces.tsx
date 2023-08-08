/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { css } from '@emotion/react';
import { EuiIcon, useEuiTheme, EuiTab } from '@elastic/eui';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import type { Tab } from '../types';

export interface LinkToApmServicesProps extends Tab {
  nodeName: string;
  apmField: string;
}

export const TabToApmTraces = ({ nodeName, apmField, name, ...props }: LinkToApmServicesProps) => {
  const { euiTheme } = useEuiTheme();

  const apmTracesMenuItemLinkProps = useLinkProps({
    app: 'apm',
    hash: 'traces',
    search: {
      kuery: `${apmField}:"${nodeName}"`,
    },
  });

  return (
    <EuiTab
      {...props}
      {...apmTracesMenuItemLinkProps}
      data-test-subj="hostsView-flyout-apm-services-link"
    >
      <EuiIcon
        type="popout"
        css={css`
          margin-right: ${euiTheme.size.xs};
        `}
      />
      {name}
    </EuiTab>
  );
};
