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
import { useMlKibana } from '../../../../../../../../../contexts/kibana';

export const DescriptionDst: FC<PropsWithChildren<unknown>> = memo(({ children }) => {
  const {
    services: { docLinks },
  } = useMlKibana();
  const docsUrl = docLinks.links.ml.calendars;
  const title = i18n.translate(
    'xpack.ml.newJob.wizard.jobDetailsStep.additionalSection.calendarsDstSelection.title',
    {
      defaultMessage: 'DST Calendars',
    }
  );
  return (
    <EuiDescribedFormGroup
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.jobDetailsStep.additionalSection.calendarsDstSelection.description"
          defaultMessage="A list of scheduled events you want to ignore, taking into account daylight saving time shifts. {learnMoreLink}"
          values={{
            learnMoreLink: (
              <EuiLink href={docsUrl} target="_blank">
                <FormattedMessage
                  id="xpack.ml.newJob.wizard.jobDetailsStep.additionalSection.calendarsDstSelection.learnMoreLinkText"
                  defaultMessage="Learn more"
                />
              </EuiLink>
            ),
          }}
        />
      }
    >
      <EuiFormRow>
        <>{children}</>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});
