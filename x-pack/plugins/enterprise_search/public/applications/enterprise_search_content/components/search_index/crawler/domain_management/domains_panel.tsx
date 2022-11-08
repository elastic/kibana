/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiPanel,
  EuiIcon,
  EuiButton,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { AddDomainLogic } from './add_domain/add_domain_logic';
import { DomainsTable } from './domains_table';

export const DomainsPanel: React.FC = () => {
  const { openFlyout } = useActions(AddDomainLogic);

  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup direction="row" alignItems="center" gutterSize="xs" justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiIcon size="m" type="globe" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              {i18n.translate('xpack.enterpriseSearch.crawler.domainsTitle', {
                defaultMessage: 'Domains',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-telemetry-id="entSearchContent-crawler-domainManagement-addDomain-addDomain"
            onClick={openFlyout}
            size="s"
            color="success"
            iconType="plusInCircle"
          >
            {i18n.translate('xpack.enterpriseSearch.crawler.addDomainFlyout.openButtonLabel', {
              defaultMessage: 'Add domain',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <DomainsTable />
    </EuiPanel>
  );
};
