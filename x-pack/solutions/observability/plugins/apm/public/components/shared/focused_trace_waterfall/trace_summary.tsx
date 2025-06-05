/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';

type TraceSummary = APIReturnType<'GET /internal/apm/traces/{traceId}/{docId}'>['summary'];

interface Props {
  summary: TraceSummary;
}

function Divider() {
  const theme = useEuiTheme();
  return (
    <EuiFlexItem
      grow={false}
      css={css`
        width: ${theme.euiTheme.border.width.thin};
        background-color: ${theme.euiTheme.border.color};
      `}
    />
  );
}

export function TraceSummary({ summary }: Props) {
  const theme = useEuiTheme();
  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="s">
          {i18n.translate('xpack.apm.traceSummary.servicesFlexItemLabel', {
            defaultMessage: '{services} {services, plural, one {service} other {services}}',
            values: { services: summary.services },
          })}
        </EuiText>
      </EuiFlexItem>
      <Divider />
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="s">
          {i18n.translate('xpack.apm.traceSummary.traceEventsFlexItemLabel', {
            defaultMessage:
              '{traceEvents} {traceEvents, plural, one {trace event} other {trace events}}',
            values: { traceEvents: summary.traceEvents },
          })}
        </EuiText>
      </EuiFlexItem>
      <Divider />
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="errorFilled" color={theme.euiTheme.colors.danger} size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText color="subdued" size="s">
              {i18n.translate('xpack.apm.traceSummary.errorsFlexItemLabel', {
                defaultMessage: '{errors} {errors, plural, one {error} other {errors}}',
                values: { errors: summary.errors },
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
