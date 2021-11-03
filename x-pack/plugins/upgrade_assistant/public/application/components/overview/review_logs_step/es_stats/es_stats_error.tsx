/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiIconTip } from '@elastic/eui';
import { ResponseError } from '../../../../lib/api';
import { getEsDeprecationError } from '../../../../lib/get_es_deprecation_error';

interface Props {
  error: ResponseError;
}

export const EsStatsErrors: React.FunctionComponent<Props> = ({ error }) => {
  let iconContent: React.ReactNode;

  const { code: errorType, message } = getEsDeprecationError(error);

  switch (errorType) {
    case 'unauthorized_error':
      iconContent = (
        <EuiIconTip
          type="alert"
          color="danger"
          size="m"
          content={message}
          iconProps={{
            'data-test-subj': 'unauthorizedErrorIconTip',
          }}
        />
      );
      break;
    case 'partially_upgraded_error':
      iconContent = (
        <EuiIconTip
          type="alert"
          color="warning"
          size="m"
          content={message}
          iconProps={{
            'data-test-subj': 'partiallyUpgradedErrorIconTip',
          }}
        />
      );
      break;
    case 'upgraded_error':
      iconContent = (
        <EuiIconTip
          type="alert"
          color="warning"
          size="m"
          content={message}
          iconProps={{
            'data-test-subj': 'upgradedErrorIconTip',
          }}
        />
      );
      break;
    case 'request_error':
    default:
      iconContent = (
        <EuiIconTip
          type="alert"
          color="danger"
          size="m"
          content={message}
          iconProps={{
            'data-test-subj': 'esRequestErrorIconTip',
          }}
        />
      );
  }

  return <span className="upgWarningIcon">{iconContent}</span>;
};
