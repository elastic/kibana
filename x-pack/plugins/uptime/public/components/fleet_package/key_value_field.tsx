/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormControlLayoutDelimited,
  EuiFormLabel,
  EuiFormFieldset,
  EuiSpacer,
} from '@elastic/eui';

const StyledFieldset = styled(EuiFormFieldset)`
  &&& {
    legend {
      width: calc(100% - 52px); // right margin + flex item padding
      margin-right: 40px;
    }
    .euiFlexGroup {
      margin-left: 0;
    }
    .euiFlexItem {
      margin-left: 0;
      padding-left: 12px;
    }
  }
`;

const StyledField = styled(EuiFieldText)`
  text-align: left;
`;

export type Pair = [
  string, // key
  string // value
];

interface Props {
  addPairControlLabel: string | React.ReactElement;
  defaultPairs: Pair[];
  onChange: (pairs: Pair[]) => void;
  onBlur?: () => void;
  'data-test-subj'?: string;
}

export const KeyValuePairsField = ({
  addPairControlLabel,
  defaultPairs,
  onChange,
  onBlur,
  'data-test-subj': dataTestSubj,
}: Props) => {
  const [pairs, setPairs] = useState<Pair[]>(defaultPairs);

  const handleOnChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>, index: number, isKey: boolean) => {
      const targetValue = event.target.value;

      setPairs((prevPairs) => {
        const newPairs = [...prevPairs];
        const [prevKey, prevValue] = prevPairs[index];
        newPairs[index] = isKey ? [targetValue, prevValue] : [prevKey, targetValue];
        return newPairs;
      });
    },
    [setPairs]
  );

  const handleAddPair = useCallback(() => {
    setPairs((prevPairs) => [['', ''], ...prevPairs]);
  }, [setPairs]);

  const handleDeletePair = useCallback(
    (index: number) => {
      setPairs((prevPairs) => {
        const newPairs = [...prevPairs];
        newPairs.splice(index, 1);
        return [...newPairs];
      });
    },
    [setPairs]
  );

  useEffect(() => {
    onChange(pairs);
  }, [onChange, pairs]);

  return (
    <div data-test-subj={dataTestSubj}>
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="plus"
            onClick={handleAddPair}
            data-test-subj={`${dataTestSubj}__button`}
          >
            {addPairControlLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <StyledFieldset
        legend={
          !!pairs.length
            ? {
                children: (
                  <EuiFlexGroup responsive={false}>
                    <EuiFlexItem>
                      {
                        <FormattedMessage
                          id="xpack.uptime.keyValuePairsField.key.label"
                          defaultMessage="Key"
                        />
                      }
                    </EuiFlexItem>
                    <EuiFlexItem>
                      {
                        <FormattedMessage
                          id="xpack.uptime.keyValuePairsField.value.label"
                          defaultMessage="Value"
                        />
                      }
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ),
              }
            : undefined
        }
      >
        {pairs.map((pair, index) => {
          const [key, value] = pair;
          return (
            <Fragment key={index}>
              <EuiSpacer size="xs" />
              <EuiFormControlLayoutDelimited
                fullWidth
                append={
                  <EuiFormLabel>
                    <EuiButtonIcon
                      iconType="trash"
                      aria-label={i18n.translate(
                        'xpack.uptime.keyValuePairsField.deleteItem.label',
                        {
                          defaultMessage: 'Delete item number {index}, {key}:{value}',
                          values: { index: index + 1, key, value },
                        }
                      )}
                      onClick={() => handleDeletePair(index)}
                    />
                  </EuiFormLabel>
                }
                startControl={
                  <StyledField
                    aria-label={i18n.translate('xpack.uptime.keyValuePairsField.key.ariaLabel', {
                      defaultMessage: 'Key',
                    })}
                    data-test-subj={`keyValuePairsKey${index}`}
                    value={key}
                    onChange={(event) => handleOnChange(event, index, true)}
                    onBlur={() => onBlur?.()}
                  />
                }
                endControl={
                  <StyledField
                    aria-label={i18n.translate('xpack.uptime.keyValuePairsField.value.ariaLabel', {
                      defaultMessage: 'Value',
                    })}
                    data-test-subj={`keyValuePairsValue${index}`}
                    value={value}
                    onChange={(event) => handleOnChange(event, index, false)}
                    onBlur={() => onBlur?.()}
                  />
                }
                delimiter=":"
              />
              <EuiSpacer size="xs" />
            </Fragment>
          );
        })}
      </StyledFieldset>
    </div>
  );
};
