/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import * as t from 'io-ts';
import React from 'react';
import { Breadcrumb } from '../../app/breadcrumb';
import { Diagnostics } from '../../app/diagnostics';
import { ApmMainTemplate } from '../templates/apm_main_template';

export const diagnostics = {
  '/diagnostics': {
    element: (
      <Breadcrumb
        href="/settings"
        title={i18n.translate('xpack.apm.views.diagnostics.breadcrumbs', {
          defaultMessage: 'Diagnostics',
        })}
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
                    <h1>
                      {i18n.translate('xpack.apm.views.diagnostics.title', {
                        defaultMessage: 'Diagnostics',
                      })}
                    </h1>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
          }}
          environmentFilter={false}
        >
          <Diagnostics />
        </ApmMainTemplate>
      </Breadcrumb>
    ),
    params: t.type({
      query: t.type({
        rangeFrom: t.string,
        rangeTo: t.string,
      }),
    }),
  },
};
