/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiFlexItem, EuiFlexGroup, EuiPageTemplate, EuiEmptyPrompt } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

import type { TransformCapability } from '../../../common/types/capabilities';
import { toArray } from '../../../common/utils/to_array';

import { useTransformCapabilities } from '../hooks';

interface Props {
  title: React.ReactNode;
  message: React.ReactNode | string;
}

export const NotAuthorizedSection = ({ title, message }: Props) => (
  <EuiEmptyPrompt iconType="securityApp" title={<h2>{title}</h2>} body={<p>{message}</p>} />
);

const MissingCapabilities: FC = () => (
  <EuiFlexGroup justifyContent="spaceAround">
    <EuiFlexItem grow={false}>
      <EuiPageTemplate.EmptyPrompt color="danger">
        <NotAuthorizedSection
          title={
            <FormattedMessage
              id="xpack.transform.app.missingCapabilitiesTitle"
              defaultMessage="Missing permission"
            />
          }
          message={
            <FormattedMessage
              id="xpack.transform.app.missingCapabilitiesDescription"
              defaultMessage="You're missing permissions to use this section of Transforms."
            />
          }
        />
      </EuiPageTemplate.EmptyPrompt>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const CapabilitiesWrapper: FC<{
  requiredCapabilities: TransformCapability | TransformCapability[];
}> = ({ children, requiredCapabilities }) => {
  const capabilities = useTransformCapabilities();

  const hasCapabilities = toArray(requiredCapabilities).every((c) => capabilities[c]);

  return hasCapabilities ? <>{children}</> : <MissingCapabilities />;
};
