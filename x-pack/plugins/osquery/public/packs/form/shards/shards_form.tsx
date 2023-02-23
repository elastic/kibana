/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import styled from 'styled-components';
import type { UseFieldArrayRemove, UseFormReturn } from 'react-hook-form';
import type { ShardsArray } from '../../../../common/schemas/common/utils';
import { ShardsPolicyField } from './shards_policy_field';
import { ShardsPercentageField } from './shards_percentage_field';
import { overflowCss } from '../../utils';

const StyledButtonWrapper = styled.div`
  margin-top: ${(props: { index: number }) => props.index === 0 && '16px'};
`;

export type ShardsFormReturn = UseFormReturn<{ shardsArray: ShardsArray }>;

interface ShardsFormProps {
  index: number;
  isLastItem: boolean;
  control: ShardsFormReturn['control'];
  onDelete?: UseFieldArrayRemove;
  options: Array<EuiComboBoxOptionOption<string>>;
}

const ShardsFormComponent = ({
  onDelete,
  index,
  isLastItem,
  control,
  options,
}: ShardsFormProps) => {
  const handleDeleteClick = useCallback(() => {
    if (onDelete) {
      onDelete(index);
    }
  }, [index, onDelete]);

  return (
    <>
      <EuiFlexGroup
        data-test-subj={`packShardsForm-${index}`}
        alignItems="flexStart"
        gutterSize="s"
      >
        <EuiFlexItem css={overflowCss}>
          <ShardsPolicyField
            index={index}
            control={control}
            hideLabel={index !== 0}
            options={options}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={true}>
              <ShardsPercentageField index={index} control={control} hideLabel={index !== 0} />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <StyledButtonWrapper index={index}>
                <EuiButtonIcon
                  aria-label={i18n.translate(
                    'xpack.osquery.pack.form.deleteShardsRowButtonAriaLabel',
                    {
                      defaultMessage: 'Delete shards row',
                    }
                  )}
                  iconType="trash"
                  color="text"
                  disabled={isLastItem}
                  onClick={handleDeleteClick}
                />
              </StyledButtonWrapper>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </>
  );
};

export const ShardsForm = React.memo(ShardsFormComponent);
