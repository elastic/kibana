/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @elastic/eui/href-or-on-click */

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { MouseEvent } from 'react';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

export function NewAlertEmptyPrompt() {
  const { services } = useKibana();
  const apmUrl = services.http?.basePath.prepend('/app/apm');
  const navigateToUrl = services.application?.navigateToUrl;
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (apmUrl && navigateToUrl) {
      navigateToUrl(apmUrl);
    }
  };

  return (
    <EuiEmptyPrompt
      iconType="alert"
      body={i18n.translate('xpack.apm.NewAlertEmptyPrompt.bodyDescription', {
        defaultMessage:
          'APM rules cannot be created in Stack Management. Go to APM and use the "Alerts and rules" menu.',
      })}
      actions={[
        <EuiButton
          color="primary"
          fill={true}
          href={apmUrl}
          onClick={handleClick}
        >
          {i18n.translate('xpack.apm.NewAlertEmptyPrompt.goToApmLinkText', {
            defaultMessage: 'Go to APM',
          })}
        </EuiButton>,
      ]}
    />
  );
}
