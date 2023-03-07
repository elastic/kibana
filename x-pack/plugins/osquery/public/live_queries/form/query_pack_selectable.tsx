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
import { useController } from 'react-hook-form';

const StyledEuiCard = styled(EuiCard)`
  padding: 0;
  display: flex;
  flex-direction: row;
  border: ${(props) => {
    if (props.selectable?.isSelected) {
      return `1px solid ${props.theme.eui.euiColorSuccess}`;
    }
  }};
  .euiCard__content {
    padding: 16px 92px 16px 16px !important;
  }
  .euiTitle {
    font-size: 1rem;
  }
  .euiText {
    margin-top: 0;
    color: ${(props) => props.theme.eui.euiTextSubduedColor};
  }

  > button[role='switch'] {
    min-inline-size: 80px;
    height: 100% !important;
    width: 80px;
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
`;
interface QueryPackSelectableProps {
  canRunSingleQuery: boolean;
  canRunPacks: boolean;
}

export const QueryPackSelectable = ({
  canRunSingleQuery,
  canRunPacks,
}: QueryPackSelectableProps) => {
  const {
    field: { value: queryType, onChange: setQueryType },
  } = useController({
    name: 'queryType',
    defaultValue: 'query',
    rules: {
      deps: ['packId', 'query'],
    },
  });

  const handleChange = useCallback(
    (type) => {
      setQueryType(type);
    },
    [setQueryType]
  );
  const queryCardSelectable = useMemo(
    () => ({
      onClick: () => handleChange('query'),
      isSelected: queryType === 'query',
      iconType: 'check',
      textProps: {}, // this is needed for the text to get wrapped in span
    }),
    [queryType, handleChange]
  );

  const packCardSelectable = useMemo(
    () => ({
      onClick: () => handleChange('pack'),
      isSelected: queryType === 'pack',
      iconType: 'check',
      textProps: {}, // this is needed for the text to get wrapped in span
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
