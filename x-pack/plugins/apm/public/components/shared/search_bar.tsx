/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut } from '@elastic/eui';
import { EuiLink } from '@elastic/eui';
import { enableInspectEsQueries } from '../../../../observability/public';
import { euiStyled } from '../../../../../../src/plugins/kibana_react/common';
import { px, unit } from '../../style/variables';
import { DatePicker } from './DatePicker';
import { KueryBar } from './KueryBar';
import { TimeComparison } from './time_comparison';
import { useBreakPoints } from '../../hooks/use_break_points';
import { useKibanaUrl } from '../../hooks/useKibanaUrl';
import { useApmPluginContext } from '../../context/apm_plugin/use_apm_plugin_context';

const EuiFlexGroupSpaced = euiStyled(EuiFlexGroup)`
  margin: ${({ theme }) =>
    `${theme.eui.euiSizeS} ${theme.eui.euiSizeS} -${theme.eui.gutterTypes.gutterMedium} ${theme.eui.euiSizeS}`};
`;

interface Props {
  prepend?: React.ReactNode | string;
  showTimeComparison?: boolean;
  showCorrelations?: boolean;
}

function getRowDirection(showColumn: boolean) {
  return showColumn ? 'column' : 'row';
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
  prepend,
  showTimeComparison = false,
  showCorrelations = false,
}: Props) {
  const { isMedium, isLarge } = useBreakPoints();
  const itemsStyle = { marginBottom: isLarge ? px(unit) : 0 };

  return (
    <>
      <DebugQueryCallout />
      <EuiFlexGroupSpaced gutterSize="m" direction={getRowDirection(isLarge)}>
        <EuiFlexItem>
          <KueryBar prepend={prepend} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            justifyContent="flexEnd"
            gutterSize="s"
            direction={getRowDirection(isMedium)}
          >
            {showTimeComparison && (
              <EuiFlexItem style={{ ...itemsStyle, minWidth: px(300) }}>
                <TimeComparison />
              </EuiFlexItem>
            )}
            <EuiFlexItem style={itemsStyle}>
              <DatePicker />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroupSpaced>
    </>
  );
}
