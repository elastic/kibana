/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

interface Props {
  serviceName: string;
}
export function UserExperienceCallout({ serviceName }: Props) {
  const { core } = useApmPluginContext();
  const userExperienceHref = core.http.basePath.prepend(
    `/app/ux?serviceName=${serviceName}`
  );

  return (
    <EuiCallOut
      iconType="cheer"
      title={i18n.translate(
        'xpack.apm.transactionOverview.userExperience.calloutTitle',
        { defaultMessage: 'Introducing: Elastic User Experience' }
      )}
    >
      <EuiText>
        {i18n.translate(
          'xpack.apm.transactionOverview.userExperience.calloutText',
          {
            defaultMessage:
              'We are beyond excited to introduce a new experience for analyzing the user experience metrics specifically for your RUM services. It provides insights into the core vitals and visitor breakdown by browser and location. The app is always available in the left sidebar among the other Observability views.',
          }
        )}
      </EuiText>
      <EuiSpacer size="m" />
      <EuiButton href={userExperienceHref}>
        {i18n.translate(
          'xpack.apm.transactionOverview.userExperience.linkLabel',
          { defaultMessage: 'Take me there' }
        )}
      </EuiButton>
    </EuiCallOut>
  );
}
