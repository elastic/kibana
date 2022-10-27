/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import { EuiTitle } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import * as t from 'io-ts';
import React from 'react';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { AgentExplorerDetails } from '../../app/agent_explorer_details';
import { Breadcrumb } from '../../app/breadcrumb';
import { ApmMainTemplate } from '../templates/apm_main_template';
import { environmentRt } from '../../../../common/environment_rt';
import { TechnicalPreviewBadge } from '../../shared/technical_preview_badge';

export const agentExplorer = {
  '/agent-explorer': {
    element: (
      <Breadcrumb
        title={i18n.translate('xpack.apm.agentExplorer.title', {
          defaultMessage: 'Agent Explorer',
        })}
        href="/agent-explorer"
      >
        <ApmMainTemplate
          pageHeader={{
            alignItems: 'center',
            pageTitle: (
              <EuiFlexGroup
                justifyContent="flexStart"
                gutterSize="s"
                alignItems="baseline"
              >
                <EuiFlexItem grow={false}>
                  <EuiTitle size="l">
                    <h2>
                      {i18n.translate('xpack.apm.views.storageExplorer.title', {
                        defaultMessage: 'Agent explorer',
                      })}
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <TechnicalPreviewBadge />
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
          }}
        >
          <AgentExplorerDetails />
        </ApmMainTemplate>
      </Breadcrumb>
    ),
    params: t.type({
      query: t.intersection([
        environmentRt,
        t.type({
          kuery: t.string,
          rangeFrom: t.string,
          rangeTo: t.string,
        }),
        t.partial({
          agentLanguage: t.string,
          serviceName: t.string,
        }),
      ]),
    }),
    defaults: {
      query: {
        environment: ENVIRONMENT_ALL.value,
        kuery: '',
        rangeFrom: 'now-24h',
        rangeTo: 'now',
      },
    },
  },
};
