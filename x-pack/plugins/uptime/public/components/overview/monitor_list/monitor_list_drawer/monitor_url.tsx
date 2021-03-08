/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiLink,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
} from '@elastic/eui';

interface Props {
  monitorUrl: string;
}
export const MonitorUrl = ({ monitorUrl }: Props) => {
  return (
    <EuiDescriptionList>
      <EuiDescriptionListTitle>
        {i18n.translate('xpack.uptime.monitorList.drawer.url', {
          defaultMessage: 'Url',
        })}
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        <EuiLink href={monitorUrl} target="_blank" external>
          {monitorUrl}
        </EuiLink>
      </EuiDescriptionListDescription>
    </EuiDescriptionList>
  );
};
