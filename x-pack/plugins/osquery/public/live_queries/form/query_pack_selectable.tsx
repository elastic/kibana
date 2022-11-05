/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';

const StyledEuiCard = styled(EuiCard)`
  /*
  TODO: this css shouldn't be necessary after https://github.com/elastic/eui/issues/6345
  tested this placeholder fix on mac in Chrome, Firefox, Safari, and Edge
  with multiple zoom levels and with keyboard <tab> navigation
  and in a responsive design / mobile view
  */
  padding-bottom: 60px;
  position: relative;

  button {
    position: absolute;
    bottom: 0;
  }
  /* end todo css */

  padding: 16px 92px 16px 16px !important;

  .euiTitle {
    font-size: 1rem;
  }

  .euiText {
    margin-top: 0;
    color: ${(props) => props.theme.eui.euiTextSubduedColor};
  }

  > button[role='switch'] {
    left: auto;
    height: 100% !important;
    width: 80px;
    right: 0;
    border-radius: 0 5px 5px 0;

    > span {
      > svg {
        width: 18px;
        height: 18px;
        display: inline-block !important;
      }

      // hide the label
      > :not(svg) {
        display: none;
      }
    }
  }

  button[aria-checked='false'] > span > svg {
    display: none;
  }
`;

interface QueryPackSelectableProps {
  queryType: string;
  setQueryType: (type: string) => void;
  canRunSingleQuery: boolean;
  canRunPacks: boolean;
  resetFormFields?: () => void;
}

export const QueryPackSelectable = ({
  queryType,
  setQueryType,
  canRunSingleQuery,
  canRunPacks,
  resetFormFields,
}: QueryPackSelectableProps) => {
  const handleChange = useCallback(
    (type) => {
      setQueryType(type);
      if (resetFormFields) {
        resetFormFields();
      }
    },
    [resetFormFields, setQueryType]
  );
  const queryCardSelectable = useMemo(
    () => ({
      onClick: () => handleChange('query'),
      isSelected: queryType === 'query',
      iconType: 'check',
    }),
    [queryType, handleChange]
  );

  const packCardSelectable = useMemo(
    () => ({
      onClick: () => handleChange('pack'),
      isSelected: queryType === 'pack',
      iconType: 'check',
    }),
    [queryType, handleChange]
  );

  return (
    <EuiFlexItem>
      <EuiFormRow label="Query type" fullWidth>
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem>
            <StyledEuiCard
              layout="horizontal"
              title={i18n.translate('xpack.osquery.liveQuery.queryForm.singleQueryTypeLabel', {
                defaultMessage: 'Single query',
              })}
              titleSize="xs"
              hasBorder
              description={i18n.translate(
                'xpack.osquery.liveQuery.queryForm.singleQueryTypeDescription',
                {
                  defaultMessage: 'Run a saved query or new one.',
                }
              )}
              selectable={queryCardSelectable}
              isDisabled={!canRunSingleQuery}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <StyledEuiCard
              layout="horizontal"
              title={i18n.translate('xpack.osquery.liveQuery.queryForm.packQueryTypeLabel', {
                defaultMessage: 'Pack',
              })}
              titleSize="xs"
              hasBorder
              description={i18n.translate(
                'xpack.osquery.liveQuery.queryForm.packQueryTypeDescription',
                {
                  defaultMessage: 'Run a set of queries in a pack.',
                }
              )}
              selectable={packCardSelectable}
              isDisabled={!canRunPacks}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiFlexItem>
  );
};
