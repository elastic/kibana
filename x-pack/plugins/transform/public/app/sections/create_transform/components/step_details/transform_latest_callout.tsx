/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiLink, EuiSpacer, EuiCallOut } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { TRANSFORM_FUNCTION } from '../../../../../../common/constants';

import { useDocumentationLinks } from '../../../../hooks';

import { useWizardSelector } from '../../state_management/create_transform_store';

export const TransformLatestCallout: FC = () => {
  const { esIndicesCreateIndex } = useDocumentationLinks();

  const transformFunction = useWizardSelector((s) => s.stepDefine.transformFunction);

  if (transformFunction !== TRANSFORM_FUNCTION.LATEST) return null;

  return (
    <>
      <EuiSpacer size={'m'} />
      <EuiCallOut color="warning" iconType="warning" size="m">
        <p>
          <FormattedMessage
            id="xpack.transform.stepDetailsForm.destinationIndexWarning"
            defaultMessage="Before you start the transform, use index templates or the {docsLink} to ensure the mappings for your destination index match the source index. Otherwise, the destination index is created with dynamic mappings. If the transform fails, check the messages tab on the Stack Management page for errors."
            values={{
              docsLink: (
                <EuiLink href={esIndicesCreateIndex} target="_blank">
                  {i18n.translate('xpack.transform.stepDetailsForm.createIndexAPI', {
                    defaultMessage: 'Create index API',
                  })}
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiCallOut>
      <EuiSpacer size={'m'} />
    </>
  );
};
