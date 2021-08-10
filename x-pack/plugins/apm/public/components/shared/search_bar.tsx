/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiFlexGroupProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { enableInspectEsQueries } from '../../../../observability/public';
import { useApmPluginContext } from '../../context/apm_plugin/use_apm_plugin_context';
import { useKibanaUrl } from '../../hooks/useKibanaUrl';
import { useBreakPoints } from '../../hooks/use_break_points';
import { DatePicker } from './DatePicker';
import { KueryBar } from './kuery_bar';
import { TimeComparison } from './time_comparison';
import { TransactionTypeSelect } from './transaction_type_select';

interface Props {
  hidden?: boolean;
  showKueryBar?: boolean;
  showTimeComparison?: boolean;
  showTransactionTypeSelector?: boolean;
}

function DebugQueryCallout() {
  const { uiSettings } = useApmPluginContext().core;
  const advancedSettingsUrl = useKibanaUrl('/app/management/kibana/settings', {
    query: {
      query: 'category:(observability)',
    },
  });

  if (!uiSettings.get(enableInspectEsQueries)) {
    return null;
  }

  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiCallOut
          title={i18n.translate(
            'xpack.apm.searchBar.inspectEsQueriesEnabled.callout.title',
            {
              defaultMessage:
                'Inspectable ES queries (`apm:enableInspectEsQueries`)',
            }
          )}
          iconType="beaker"
          color="warning"
        >
          <FormattedMessage
            id="xpack.apm.searchBar.inspectEsQueriesEnabled.callout.description"
            defaultMessage="You can now inspect every Elasticsearch query by opening your browser's Dev Tool and looking at the API responses. The setting can be disabled in Kibana's {advancedSettingsLink}"
            values={{
              advancedSettingsLink: (
                <EuiLink href={advancedSettingsUrl}>
                  {i18n.translate(
                    'xpack.apm.searchBar.inspectEsQueriesEnabled.callout.description.advancedSettings',
                    { defaultMessage: 'Advanced Settings' }
                  )}
                </EuiLink>
              ),
            }}
          />
        </EuiCallOut>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function SearchBar({
  hidden = false,
  showKueryBar = true,
  showTimeComparison = false,
  showTransactionTypeSelector = false,
}: Props) {
  const { isSmall, isMedium, isLarge, isXl, isXXL, isXXXL } = useBreakPoints();

  if (hidden) {
    return null;
  }

  const searchBarDirection: EuiFlexGroupProps['direction'] =
    isXXXL || (!isXl && !showTimeComparison) ? 'row' : 'column';

  return (
    <>
      <DebugQueryCallout />
      <EuiFlexGroup
        gutterSize="s"
        responsive={false}
        direction={searchBarDirection}
      >
        <EuiFlexItem>
          <EuiFlexGroup
            direction={isLarge ? 'columnReverse' : 'row'}
            gutterSize="s"
            responsive={false}
          >
            {showTransactionTypeSelector && (
              <EuiFlexItem grow={false}>
                <TransactionTypeSelect />
              </EuiFlexItem>
            )}

            {showKueryBar && (
              <EuiFlexItem>
                <KueryBar />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={showTimeComparison && !isXXXL}>
          <EuiFlexGroup
            direction={isSmall || isMedium || isLarge ? 'columnReverse' : 'row'}
            justifyContent={isXXL ? 'flexEnd' : undefined}
            gutterSize="s"
            responsive={false}
          >
            {showTimeComparison && (
              <EuiFlexItem grow={isXXXL} style={{ minWidth: 300 }}>
                <TimeComparison />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <DatePicker />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </>
  );
}
