/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, ReactNode, memo, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiHorizontalRule,
  EuiText,
  EuiShowFor,
  EuiPanel,
  EuiTextColor,
  EuiIconTip,
} from '@elastic/eui';

import { ThemeContext } from 'styled-components';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { OS_TITLES } from '../../../../../common/translations';

const TITLES = {
  type: i18n.translate('xpack.securitySolution.endpoint.policyDetailType', {
    defaultMessage: 'Type',
  }),
  os: i18n.translate('xpack.securitySolution.endpoint.policyDetailOS', {
    defaultMessage: 'Operating system',
  }),
};

interface ConfigFormProps {
  /**
   * A subtitle for this component.
   **/
  type: string;
  /**
   * Types of supported operating systems.
   */
  supportedOss: OperatingSystem[];
  osRestriction?: ReactNode;
  dataTestSubj?: string;
  /** React Node to be put on the right corner of the card */
  rightCorner?: ReactNode;
}

export const ConfigFormHeading: FC = memo(({ children }) => (
  <EuiTitle size="xxs">
    <h5>{children}</h5>
  </EuiTitle>
));

ConfigFormHeading.displayName = 'ConfigFormHeading';

export const ConfigForm: FC<ConfigFormProps> = memo(
  ({ type, supportedOss, osRestriction, dataTestSubj, rightCorner, children }) => {
    const paddingSize = useContext(ThemeContext).eui.euiPanelPaddingModifiers.paddingMedium;
    return (
      <EuiPanel data-test-subj={dataTestSubj} hasBorder={true} hasShadow={false} paddingSize="none">
        <EuiFlexGroup
          direction="row"
          gutterSize="none"
          alignItems="center"
          style={{ padding: `${paddingSize} ${paddingSize} 0 ${paddingSize}` }}
        >
          <EuiFlexItem grow={1}>
            <ConfigFormHeading>{TITLES.type}</ConfigFormHeading>
            <EuiText size="s">{type}</EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={2}>
            <ConfigFormHeading>{TITLES.os}</ConfigFormHeading>
            <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiText size="s">{supportedOss.map((os) => OS_TITLES[os]).join(', ')} </EuiText>
              </EuiFlexItem>
              {osRestriction && (
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup direction="row" gutterSize="xs">
                    <EuiFlexItem grow={false}>
                      <EuiTextColor color="subdued">
                        <FormattedMessage
                          id="xpack.securitySolution.endpoint.policy.details.antivirusRegistration.osRestriction"
                          defaultMessage="Restrictions"
                        />
                      </EuiTextColor>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiIconTip type="iInCircle" color="subdued" content={osRestriction} />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiShowFor sizes={['m', 'l', 'xl']}>
            <EuiFlexItem grow={3}>
              <EuiFlexGroup direction="row" gutterSize="none" justifyContent="flexEnd">
                <EuiFlexItem grow={false}>{rightCorner}</EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiShowFor>
          <EuiShowFor sizes={rightCorner ? ['s', 'xs'] : []}>
            <EuiFlexItem>{rightCorner}</EuiFlexItem>
          </EuiShowFor>
        </EuiFlexGroup>

        <EuiHorizontalRule margin="m" />

        <div style={{ padding: `0 ${paddingSize} ${paddingSize} ${paddingSize}` }}>{children}</div>
      </EuiPanel>
    );
  }
);

ConfigForm.displayName = 'ConfigForm';
