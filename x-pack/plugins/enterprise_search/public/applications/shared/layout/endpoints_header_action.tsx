/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiHeaderLinks } from '@elastic/eui';

import { openWiredConnectionDetails } from '@kbn/cloud/connection_details';
import { i18n } from '@kbn/i18n';

import { EndpointIcon } from './endpoint_icon';

export const EndpointsHeaderAction: React.FC = ({ children }) => {
  return (
    <EuiHeaderLinks>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        {!!children && <EuiFlexItem>{children}</EuiFlexItem>}
        <EuiButtonEmpty
          iconType={EndpointIcon}
          size="s"
          onClick={() => openWiredConnectionDetails()}
          data-test-subj="enterpriseSearchEndpointsHeaderActionEndpointsApiKeysButton"
        >
          {i18n.translate('xpack.enterpriseSearch.pageTemplate.endpointsButtonLabel', {
            defaultMessage: 'Endpoints & API keys',
          })}
        </EuiButtonEmpty>
      </EuiFlexGroup>
    </EuiHeaderLinks>
  );
};
