/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { StorageExplorer } from '../../app/storage_explorer';
import { BetaBadge } from '../../shared/beta_badge';
import { ApmMainTemplate } from '../templates/apm_main_template';
import { Breadcrumb } from '../../app/breadcrumb';

export const storageExplorer = {
  '/storage-explorer': {
    element: (
      <Breadcrumb
        title={i18n.translate('xpack.apm.views.storageExplorer.title', {
          defaultMessage: 'Storage explorer',
        })}
        href="/storage-explorer"
      >
        <ApmMainTemplate
          pageTitle={
            <EuiFlexGroup
              justifyContent="flexStart"
              gutterSize="s"
              alignItems="baseline"
            >
              <EuiFlexItem grow={false}>
                <EuiTitle size="l">
                  <h2>
                    {i18n.translate('xpack.apm.views.storageExplorer.title', {
                      defaultMessage: 'Storage explorer',
                    })}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <BetaBadge />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          <StorageExplorer />
        </ApmMainTemplate>
      </Breadcrumb>
    ),
  },
};
