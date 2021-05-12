/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { parse, format } from 'url';
import { uniqBy } from 'lodash';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { APIReturnType } from '../../../../services/rest/createCallApmApi';
import { asPercent, asDuration } from '../../../../../common/utils/formatters';
import { TimestampTooltip } from '../../../shared/TimestampTooltip';

interface AlertDetailProps {
  alerts: APIReturnType<'GET /api/apm/services/{serviceName}/alerts'>['alerts'];
}

export function AlertDetails({ alerts }: AlertDetailProps) {
  const {
    apmRuleRegistry,
    core: {
      http: {
        basePath: { prepend },
      },
    },
  } = useApmPluginContext();

  const {
    urlParams: { rangeFrom, rangeTo },
  } = useUrlParams();

  const collapsedAlerts = uniqBy(
    alerts,
    (alert) => alert['kibana.rac.alert.id']!
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {collapsedAlerts.map((alert) => {
        const ruleType = apmRuleRegistry.getTypeByRuleId(alert['rule.id']!);
        const formatted = {
          link: undefined,
          reason: alert['rule.name'],
          ...(ruleType?.format?.({
            alert,
            formatters: { asDuration, asPercent },
          }) ?? {}),
        };

        const parsedLink = formatted.link
          ? parse(formatted.link, true)
          : undefined;

        return (
          <EuiFlexItem grow>
            <EuiFlexGroup direction="row" gutterSize="s">
              <EuiFlexItem grow>
                {parsedLink ? (
                  <EuiLink
                    href={prepend(
                      format({
                        ...parsedLink,
                        query: {
                          ...parsedLink.query,
                          rangeFrom,
                          rangeTo,
                        },
                      })
                    )}
                  >
                    {formatted.reason}
                  </EuiLink>
                ) : (
                  formatted.reason
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <TimestampTooltip
                  time={new Date(alert['kibana.rac.alert.start']!).getTime()}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
}
