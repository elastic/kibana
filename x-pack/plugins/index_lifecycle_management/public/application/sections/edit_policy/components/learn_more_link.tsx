/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  docPath: string;
  text?: ReactNode;
}

export const LearnMoreLink: React.FunctionComponent<Props> = ({ docPath, text }) => {
  const content = text ? (
    text
  ) : (
    <FormattedMessage id="xpack.indexLifecycleMgmt.learnMore" defaultMessage="Learn more" />
  );
  return (
    <EuiLink href={docPath} target="_blank" external={true}>
      {content}
    </EuiLink>
  );
};
