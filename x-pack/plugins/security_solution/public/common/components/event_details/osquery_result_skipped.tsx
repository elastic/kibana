/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAvatar,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { useMemo } from 'react';

import { map, reduce } from 'lodash';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ResponseAction } from '../../../../common/detection_engine/rule_response_actions/schemas';
import { replaceParamsQuery } from '../../../../common/utils/replace_params_query';
import type { AlertRawEventData } from './osquery_tab';

export interface OsquerySkippedResultsItemType {
  key: number;
  value: string[];
}

interface SkippeResultsProps {
  responseActions: ResponseAction[];
  rawEventData: AlertRawEventData;
}

const StyledEuiCodeBlock = styled(EuiCodeBlock)`
  > pre {
    margin-block-end: 0;
  }
`;

export const OsquerySkippedResults = ({ responseActions, rawEventData }: SkippeResultsProps) => {
  const actions = getInvalidResponseActionsQueries(responseActions, rawEventData);

  if (!actions.length) {
    return null;
  }

  return (
    <>
      {map(actions, (action, index) => (
        <React.Fragment key={index}>
          <OsquerySkippedResultsItem action={action} />
        </React.Fragment>
      ))}
    </>
  );
};

const OsquerySkippedResultsItem = ({ action }: { action: OsquerySkippedResultsItemType }) => {
  const renderQuery = useMemo(() => {
    return (
      <ul>
        <EuiText size="s" css={{ padding: '8px 0 0 8px' }}>
          <FormattedMessage
            id="xpack.securitySolution.eventDetails.osqueryTab.skippedQueries"
            defaultMessage="These queries {bold} due to parameter's value not found in the Alert"
            values={{
              bold: (
                <strong>
                  <FormattedMessage
                    id="xpack.securitySolution.eventDetails.osqueryTab.notCalled"
                    defaultMessage="haven't been called"
                  />
                </strong>
              ),
            }}
          />
        </EuiText>
        <EuiText size="s">
          {map(action.value, (query) => (
            <li>
              <StyledEuiCodeBlock language="sql" fontSize="s" paddingSize="s" transparentBackground>
                {query}
              </StyledEuiCodeBlock>
            </li>
          ))}
        </EuiText>
      </ul>
    );
  }, [action]);

  return (
    <EuiFlexGroup alignItems={'flexStart'} gutterSize={'s'}>
      <EuiFlexItem grow={false}>
        <EuiAvatar name="osquery" color={'subdued'} iconType="logoOsquery" />
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <EuiPanel color={'danger'} paddingSize={'s'}>
          {renderQuery}
        </EuiPanel>
        <EuiSpacer size="s" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const getInvalidResponseActionsQueries = (
  responseActions: ResponseAction[],
  rawEventData: AlertRawEventData
) => {
  const invalidQueries: OsquerySkippedResultsItemType[] = [];
  responseActions?.forEach((action, index) => {
    if (action.params.queries?.length) {
      const replacedQueries = reduce(
        action.params.queries,
        (acc: string[], query) => {
          const { result, skipped } = replaceParamsQuery(
            query.query,
            rawEventData.fields as object
          );

          return skipped ? [...acc, result] : acc;
        },
        []
      );
      if (replacedQueries?.length) {
        invalidQueries.push({ key: index, value: replacedQueries });
      }
    } else if (action.params.query) {
      const { result, skipped } = replaceParamsQuery(
        action.params.query,
        rawEventData.fields as object
      );

      if (skipped) {
        invalidQueries.push({ key: index, value: [result] });
      }
    }
  });
  return invalidQueries;
};
