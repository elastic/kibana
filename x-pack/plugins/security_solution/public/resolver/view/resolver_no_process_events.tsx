/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { EuiCodeBlock, EuiFlexGroup, EuiTitle, EuiSpacer, EuiText } from '@elastic/eui';
import { useFormattedDate } from './panels/use_formatted_date';
import * as selectors from '../store/selectors';

const StyledEuiCodeBlock = styled(EuiCodeBlock)`
  align-self: flex-start;
  display: inline-block;
`;

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  max-width: 600px;
  margin: 60px auto 0;
`;

export const ResolverNoProcessEvents = () => {
  const originTimestamp = useSelector(selectors.resolverTreeOriginTimestamp);
  const formattedDate = useFormattedDate(originTimestamp);
  return (
    <StyledEuiFlexGroup direction="column">
      <EuiTitle>
        <h4>
          {i18n.translate('xpack.securitySolution.resolver.noProcessEvents.title', {
            defaultMessage: 'No Process Events Found',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText size="s">
        {i18n.translate('xpack.securitySolution.resolver.noProcessEvents.timeRange', {
          defaultMessage: `
            The Analyze Event tool creates graphs based on process events.
            If the analyzed event does not have an associated process in the current time range,
            or stored in Elasticsearch within any time range, a graph will not be created.`,
        })}
      </EuiText>
      <EuiSpacer size="m" />
      {formattedDate ? (
        <>
          <EuiText size="s" data-test-subj="resolver:origin-timestamp">
            {i18n.translate('xpack.securitySolution.resolver.noProcessEvents.originTimestamp', {
              defaultMessage: `Analyzer did find a process event associated with this alert, make sure your current time range
              filter is inclusive of this date.`,
            })}
          </EuiText>
          <EuiSpacer size="m" />
          <StyledEuiCodeBlock language="html" paddingSize="s" isCopyable>
            {formattedDate}
          </StyledEuiCodeBlock>
        </>
      ) : (
        <>
          <EuiText size="s" data-test-subj="resolver:search-for-process-events">
            {i18n.translate('xpack.securitySolution.resolver.noProcessEvents.eventCategory', {
              defaultMessage: `You may also add the below to your timeline query to check for process events.
              If none are listed, a graph cannot be created from events found in that query.`,
            })}
          </EuiText>
          <EuiSpacer size="m" />
          <StyledEuiCodeBlock language="html" paddingSize="s" isCopyable>
            {'event.category: "process"'}
          </StyledEuiCodeBlock>
        </>
      )}
    </StyledEuiFlexGroup>
  );
};
