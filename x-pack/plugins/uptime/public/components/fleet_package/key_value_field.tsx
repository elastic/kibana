/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  EuiFieldText,
  EuiCheckbox,
  htmlIdGenerator,
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
      width: calc(100% - 40px);
      margin-left: 40px;
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
  string, // value
  boolean // checked, i.e. key is active
];

interface Props {
  defaultPairs: Pair[];
  onChange: (pairs: Pair[]) => void;
}

export const KeyValuePairsField = ({ defaultPairs, onChange }: Props) => {
  const [pairs, setPairs] = useState<Pair[]>(defaultPairs);
  const handleOnCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const checked = event.target.checked;
    setPairs((prevPairs) => {
      const newPairs = [...prevPairs];
      const [key, value] = prevPairs[index];
      newPairs[index] = [key, value, checked];
      return newPairs;
    });
  };

  const handleOnChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>, index: number, isKey: boolean) => {
      const targetValue = event.target.value;

      setPairs((prevPairs) => {
        const newPairs = [...prevPairs];
        const [prevKey, prevValue, prevChecked] = prevPairs[index];
        let checked;
        // if there previously wasn't a key, and a new key is added
        if (!prevKey && isKey && targetValue) {
          checked = true;
          // if the item we are updating is an existing key
        } else if (isKey) {
          checked = targetValue ? true : false;
          // if the item we are updating is a value
        } else {
          checked = prevChecked;
        }
        newPairs[index] = isKey
          ? [targetValue, prevValue, checked]
          : [prevKey, targetValue, checked];
        const isLastRow = prevPairs.length - 1 === index;

        // automatically add a new row if the current is the last row and previously did not contain a key
        if (isLastRow && !prevPairs[index][0]) {
          newPairs.push(['', '', false]);
        }
        return newPairs;
      });
    },
    [setPairs]
  );

  useEffect(() => {
    onChange(pairs);
  }, [onChange, pairs]);

  return (
    <>
      <EuiSpacer size="s" />
      <StyledFieldset
        legend={{
          children: (
            <EuiFlexGroup responsive={false}>
              <EuiFlexItem>Key</EuiFlexItem>
              <EuiFlexItem>Value</EuiFlexItem>
            </EuiFlexGroup>
          ),
        }}
      >
        {pairs.map((pair, index) => {
          const [key, value, checked] = pair;
          return (
            <EuiFormControlLayoutDelimited
              key={index}
              fullWidth
              prepend={
                <EuiFormLabel>
                  <EuiCheckbox
                    id={htmlIdGenerator()()}
                    checked={checked}
                    disabled={!key}
                    onChange={(event) => handleOnCheckboxChange(event, index)}
                  />
                </EuiFormLabel>
              }
              startControl={
                <StyledField value={key} onChange={(event) => handleOnChange(event, index, true)} />
              }
              endControl={
                <StyledField
                  value={value}
                  onChange={(event) => handleOnChange(event, index, false)}
                />
              }
              delimiter=":"
            />
          );
        })}
      </StyledFieldset>
    </>
  );
};
