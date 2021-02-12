/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { euiStyled } from '../../../../../../src/plugins/kibana_react/common';
import { px, unit } from '../../style/variables';
import { DatePicker } from './DatePicker';
import { KueryBar } from './KueryBar';
import { TimeComparison } from './time_comparison';
import { useBreakPoints } from '../../hooks/use_break_points';
import { Correlations } from '../app/correlations';
import { enableCorrelations } from '../../../common/ui_settings_keys';
import { useApmPluginContext } from '../../context/apm_plugin/use_apm_plugin_context';
import { isActivePlatinumLicense } from '../../../common/license_check';
import { useLicenseContext } from '../../context/license/use_license_context';

const SearchBarFlexGroup = euiStyled(EuiFlexGroup)`
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

export function SearchBar({
  prepend,
  showTimeComparison = false,
  showCorrelations = false,
}: Props) {
  const { uiSettings } = useApmPluginContext().core;
  const license = useLicenseContext();
  const hasCorrelationsAccess =
    uiSettings.get(enableCorrelations) && isActivePlatinumLicense(license);

  const { isMedium, isLarge } = useBreakPoints();
  const itemsStyle = { marginBottom: isLarge ? px(unit) : 0 };

  return (
    <SearchBarFlexGroup gutterSize="m" direction={getRowDirection(isLarge)}>
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
      {showCorrelations && hasCorrelationsAccess && (
        <EuiFlexItem grow={false}>
          <Correlations />
        </EuiFlexItem>
      )}
    </SearchBarFlexGroup>
  );
}
