/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiDescribedFormGroup, EuiFormRow, EuiLink } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMlKibana } from '../../../../../contexts/kibana';

export const Description: FC<PropsWithChildren<unknown>> = memo(({ children }) => {
  const {
    services: { docLinks },
  } = useMlKibana();
  const docsUrl = docLinks.links.ml.customUrls;
  const title = i18n.translate(
    'xpack.ml.dataframe.analytics.create.detailsStep.additionalSection.customUrls.title',
    {
      defaultMessage: 'Custom URLs',
    }
  );

  const cssOverride = css({
    '> .euiFlexGroup': {
      '> .euiFlexItem': {
        '&:last-child': {
          flexBasis: '50%',
        },
      },
    },
  });

  return (
    <EuiDescribedFormGroup
      fullWidth
      css={cssOverride}
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.create.detailsStep.additionalSection.customUrlsSelection.description"
          defaultMessage="Provide links from analytics job results to Kibana dashboards, Discover, or other web pages. {learnMoreLink}"
          values={{
            learnMoreLink: (
              <EuiLink href={docsUrl} target="_blank">
                <FormattedMessage
                  id="xpack.ml.dataframe.analytics.create.detailsStep.additionalSection.customUrlsSelection.learnMoreLinkText"
                  defaultMessage="Learn more"
                />
              </EuiLink>
            ),
          }}
        />
      }
    >
      <EuiFormRow fullWidth>
        <>{children}</>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});
