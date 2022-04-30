/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useKibana } from '../../../utils/kibana_react';

export function MobileAddData() {
  const kibana = useKibana();

  return (
    <EuiHeaderLink
      aria-label={i18n.translate('xpack.observability.page_header.addMobileDataLink.label', {
        defaultMessage: 'Navigate to a tutorial about adding mobile APM data',
      })}
      href={kibana.services?.application?.getUrlForApp('/home#/tutorial/apm')}
      color="primary"
      iconType="indexOpen"
    >
      {ADD_DATA_LABEL}
    </EuiHeaderLink>
  );
}

const ADD_DATA_LABEL = i18n.translate('xpack.observability.mobile.addDataButtonLabel', {
  defaultMessage: 'Add Mobile data',
});
