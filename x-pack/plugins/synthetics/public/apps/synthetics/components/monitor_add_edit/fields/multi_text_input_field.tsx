/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
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

interface Props {
  addPairControlLabel: string | React.ReactElement;
  defaultValue: string[];
  onChange: (urlPatterns: string[]) => void;
  onBlur?: () => void;
  'data-test-subj'?: string;
  readOnly?: boolean;
}

export const MultiTextInputField = ({
  addPairControlLabel,
  defaultValue,
  onChange,
  onBlur,
  'data-test-subj': dataTestSubj,
  readOnly,
}: Props) => {
  const [urlPatterns, setUrlPatterns] = useState<string[]>(defaultValue);

  const handleOnChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
      const targetValue = event.target.value;

      setUrlPatterns((prevPatterns) => {
        const newPatterns = [...prevPatterns];
        newPatterns[index] = targetValue;
        return newPatterns;
      });
    },
    [setUrlPatterns]
  );

  const handleAddPattern = useCallback(() => {
    setUrlPatterns((prevPatterns) => ['', ...prevPatterns]);
  }, [setUrlPatterns]);

  const handleDeletePattern = useCallback(
    (index: number) => {
      setUrlPatterns((prevPatterns) => {
        const newPatterns = [...prevPatterns];
        newPatterns.splice(index, 1);
        return [...newPatterns];
      });
    },
    [setUrlPatterns]
  );

  useEffect(() => {
    onChange(urlPatterns);
  }, [onChange, urlPatterns]);

  return (
    <div data-test-subj={dataTestSubj}>
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType="plus"
            onClick={handleAddPattern}
            data-test-subj={`${dataTestSubj}__button`}
            isDisabled={readOnly}
          >
            {addPairControlLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <StyledFieldset>
        {urlPatterns.map((value, index) => {
          return (
            <Fragment key={index}>
              <EuiSpacer size="xs" />
              <StyledField
                aria-label={i18n.translate('xpack.synthetics.keyValuePairsField.value.ariaLabel', {
                  defaultMessage: 'Value',
                })}
                data-test-subj={`keyValuePairsValue${index}`}
                value={value}
                onChange={(event) => handleOnChange(event, index)}
                onBlur={() => onBlur?.()}
                readOnly={readOnly}
                fullWidth={true}
                append={
                  <EuiFormLabel>
                    <EuiButtonIcon
                      iconType="trash"
                      aria-label={i18n.translate(
                        'xpack.synthetics.multiTextInputField.deleteItem.label',
                        {
                          defaultMessage: 'Delete item number {index}, {value}',
                          values: { index: index + 1, value },
                        }
                      )}
                      onClick={() => handleDeletePattern(index)}
                      isDisabled={readOnly}
                    />
                  </EuiFormLabel>
                }
              />
              <EuiSpacer size="xs" />
            </Fragment>
          );
        })}
      </StyledFieldset>
    </div>
  );
};
