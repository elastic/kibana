/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
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
  EuiFormRow,
} from '@elastic/eui';
import { ConfigKeys, ContentType, ICustomFields } from './types';

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
    }
  }
`;

interface Props {
  configKey: ConfigKeys;
  label: string | React.ReactElement;
  contentType?: ContentType;
  setFields: React.Dispatch<React.SetStateAction<ICustomFields>>;
}

export const HeaderField = ({ configKey, contentType, label, setFields }: Props) => {
  const [headers, setHeaders] = useState<Array<[string, string, boolean]>>([['', '', false]]);
  const handleOnCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const checked = event.target.checked;
    setHeaders((prevHeaders) => {
      const newHeaders = [...prevHeaders];
      const [key, value] = prevHeaders[index];
      newHeaders[index] = [key, value, checked];
      return newHeaders;
    });
  };

  const handleOnChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    index: number,
    isKey: boolean
  ) => {
    const targetValue = event.target.value;

    setHeaders((prevHeaders) => {
      const newHeaders = [...prevHeaders];
      const [prevKey, prevValue, prevChecked] = prevHeaders[index];
      const checked = !prevKey ? true : prevChecked;
      newHeaders[index] = isKey
        ? [targetValue, prevValue, checked]
        : [prevKey, targetValue, checked];
      const isLastRow = prevHeaders.length - 1 === index;

      // automatically add a new row if the current is the last row and previously did not contain a key
      if (isLastRow && !prevHeaders[index][0]) {
        newHeaders.push(['', '', false]);
      }
      return newHeaders;
    });
  };

  useEffect(() => {
    setFields((prevFields) => {
      const formattedHeaders = headers.reduce((acc: Record<string, string>, header) => {
        const [key, value, checked] = header;
        if (checked) {
          return {
            ...acc,
            [key]: value,
          };
        }
        return acc;
      }, {});
      if (contentType) {
        return {
          ...prevFields,
          [configKey]: { 'Content-Type': contentType, ...formattedHeaders },
        };
      } else {
        return {
          ...prevFields,
          [configKey]: formattedHeaders,
        };
      }
    });
  }, [configKey, contentType, headers, setFields]);

  return (
    <EuiFormRow fullWidth label={label}>
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
          {headers.map((header, index) => {
            const [key, value, checked] = header;
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
                  <EuiFieldText
                    value={key}
                    onChange={(event) => handleOnChange(event, index, true)}
                  />
                }
                endControl={
                  <EuiFieldText
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
    </EuiFormRow>
  );
};
