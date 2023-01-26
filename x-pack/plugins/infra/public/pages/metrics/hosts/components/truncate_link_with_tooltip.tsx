/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip, EuiLink } from '@elastic/eui';
import React from 'react';
import { LinkDescriptor, useLinkProps } from '@kbn/observability-plugin/public';

interface Props {
  text: string;
  linkProps: LinkDescriptor;
}

export function TruncateLinkWithTooltip(props: Props) {
  const { text, linkProps } = props;

  const link = useLinkProps(linkProps);

  return (
    <div className="eui-displayBlock eui-fullWidth">
      <EuiToolTip
        className="eui-fullWidth"
        delay="long"
        content={text}
        anchorClassName="eui-fullWidth"
      >
        <EuiLink className="eui-displayBlock eui-textTruncate" {...link}>
          {text}
        </EuiLink>
      </EuiToolTip>
    </div>
  );
}
