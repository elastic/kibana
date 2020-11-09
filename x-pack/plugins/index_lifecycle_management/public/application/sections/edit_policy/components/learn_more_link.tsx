/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { createDocLink } from '../../../services/documentation';

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
    <EuiLink href={createDocLink(docPath)} target="_blank" external={true}>
      {content}
    </EuiLink>
  );
};
