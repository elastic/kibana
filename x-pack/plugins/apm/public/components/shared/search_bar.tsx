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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { euiStyled } from '../../../../../../src/plugins/kibana_react/common';
import { enableInspectEsQueries } from '../../../../observability/public';
import { useApmPluginContext } from '../../context/apm_plugin/use_apm_plugin_context';
import { useKibanaUrl } from '../../hooks/useKibanaUrl';
import { useBreakPoints } from '../../hooks/use_break_points';
import { px } from '../../style/variables';
import { DatePicker } from './DatePicker';
import { KueryBar } from './KueryBar';
import { TimeComparison } from './time_comparison';
import { TransactionTypeSelect } from './transaction_type_select';

const EuiFlexGroupSpaced = euiStyled(EuiFlexGroup)`
  margin: ${({ theme }) =>
    `${theme.eui.euiSizeS} ${theme.eui.euiSizeS} -${theme.eui.gutterTypes.gutterMedium} ${theme.eui.euiSizeS}`};
`;

interface Props {
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
    <EuiFlexGroupSpaced>
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
    </EuiFlexGroupSpaced>
  );
}

export function SearchBar({
  showTimeComparison = false,
  showTransactionTypeSelector = false,
}: Props) {
  const { isSmall, isMedium, isLarge, isXl, isXXL } = useBreakPoints();
  return (
    <>
      <DebugQueryCallout />
      <EuiFlexGroupSpaced
        gutterSize="s"
        responsive={false}
        direction={isXXL ? 'row' : 'column'}
      >
        <EuiFlexItem>
          <EuiFlexGroup
            direction={isSmall ? 'columnReverse' : 'row'}
            gutterSize="s"
            responsive={false}
          >
            {showTransactionTypeSelector && (
              <EuiFlexItem grow={false}>
                <TransactionTypeSelect />
              </EuiFlexItem>
            )}
            <EuiFlexItem>
              <KueryBar />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={showTimeComparison && !isXXL}>
          <EuiFlexGroup
            direction={isSmall || isMedium ? 'columnReverse' : 'row'}
            justifyContent={isLarge || isXl ? 'flexEnd' : undefined}
            gutterSize="s"
            responsive={false}
          >
            {showTimeComparison && (
              <EuiFlexItem grow={isXXL} style={{ minWidth: px(300) }}>
                <TimeComparison />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <DatePicker />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroupSpaced>
      <EuiSpacer size="s" />
    </>
  );
}
