/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiRadio } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { noop } from 'lodash';
import styled from '@emotion/styled';
import type { EuiThemeComputed } from '@elastic/eui/src/services/theme/types';

const StyledEuiCard = styled(EuiCard)`
  padding: 16px 92px 16px 16px !important;
  border: ${({
    theme,
    selectable,
  }: {
    theme: { euiTheme: EuiThemeComputed };
    selectable: { isSelected: boolean };
  }) => {
    if (selectable?.isSelected) {
      return `1px solid ${theme.euiTheme.colors.success}`;
    }
  }};

  .euiTitle {
    font-size: 1rem;
  }

  .euiSpacer {
    display: none;
  }

  .euiText {
    margin-top: 0;
    margin-left: 25px;
    color: ${({ theme }) => theme.euiTheme.colors.subduedText};
  }

  > button[role='switch'] {
    display: none;
  }
`;

interface PackTypeSelectableProps {
  packType: string;
  setPackType: (type: 'global' | 'policy') => void;
  resetFormFields?: () => void;
}

const PackTypeSelectableComponent = ({
  packType,
  setPackType,
  resetFormFields,
}: PackTypeSelectableProps) => {
  const handleChange = useCallback(
    (type) => {
      setPackType(type);
      if (resetFormFields) {
        resetFormFields();
      }
    },
    [resetFormFields, setPackType]
  );
  const policyCardSelectable = useMemo(
    () => ({
      onClick: () => handleChange('policy'),
      isSelected: packType === 'policy',
    }),
    [packType, handleChange]
  );

  const globalCardSelectable = useMemo(
    () => ({
      onClick: () => handleChange('global'),
      isSelected: packType === 'global',
    }),
    [packType, handleChange]
  );

  return (
    <EuiFlexItem>
      <EuiFormRow label="Type" fullWidth>
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem>
            {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
            {/* @ts-ignore // TODO wait for changes in css?: Interpolation<Theme>*/}
            <StyledEuiCard
              layout="horizontal"
              title={
                <EuiRadio
                  id={'osquery_pack_type_policy'}
                  label={i18n.translate('xpack.osquery.pack.form.policyLabel', {
                    defaultMessage: 'Policy',
                  })}
                  onChange={noop}
                  checked={packType === 'policy'}
                />
              }
              titleSize="xs"
              hasBorder
              description={i18n.translate('xpack.osquery.pack.form.policyDescription', {
                defaultMessage: 'Schedule pack for specific policy.',
              })}
              data-test-subj={'osqueryPackTypePolicy'}
              selectable={policyCardSelectable}
              {...(packType === 'policy' && { color: 'primary' })}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
            {/* @ts-ignore // TODO wait for changes in css?: Interpolation<Theme>*/}
            <StyledEuiCard
              layout="horizontal"
              title={
                <EuiRadio
                  id={'osquery_pack_type_global'}
                  label={i18n.translate('xpack.osquery.pack.form.globalLabel', {
                    defaultMessage: 'Global',
                  })}
                  onChange={noop}
                  checked={packType === 'global'}
                />
              }
              titleSize="xs"
              description={i18n.translate('xpack.osquery.pack.form.globalDescription', {
                defaultMessage: 'Use pack across all policies',
              })}
              selectable={globalCardSelectable}
              data-test-subj={'osqueryPackTypeGlobal'}
              {...(packType === 'global' && { color: 'primary' })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiFlexItem>
  );
};

export const PackTypeSelectable = React.memo(PackTypeSelectableComponent);
