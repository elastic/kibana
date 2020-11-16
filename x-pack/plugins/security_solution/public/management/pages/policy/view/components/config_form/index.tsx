/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, ReactNode, memo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiHorizontalRule,
  EuiText,
  EuiShowFor,
  EuiPanel,
} from '@elastic/eui';

import { OperatingSystem } from '../../../../../../../common/endpoint/types';
import { OS_TITLES } from '../../../../../common/translations';

const TITLES = {
  type: i18n.translate('xpack.securitySolution.endpoint.policyDetailType', {
    defaultMessage: 'Type',
  }),
  os: i18n.translate('xpack.securitySolution.endpoint.policyDetailOS', {
    defaultMessage: 'Operating System',
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
  ({ type, supportedOss, dataTestSubj, rightCorner, children }) => (
    <EuiPanel data-test-subj={dataTestSubj}>
      <EuiFlexGroup direction="row" gutterSize="none" alignItems="center">
        <EuiFlexItem>
          <ConfigFormHeading>{TITLES.type}</ConfigFormHeading>
          <EuiText size="m">{type}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <ConfigFormHeading>{TITLES.os}</ConfigFormHeading>
          <EuiText>{supportedOss.map((os) => OS_TITLES[os]).join(', ')}</EuiText>
        </EuiFlexItem>
        <EuiShowFor sizes={['m', 'l', 'xl']}>
          <EuiFlexItem>
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

      {children}
    </EuiPanel>
  )
);

ConfigForm.displayName = 'ConfigForm';
