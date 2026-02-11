/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import styled from '@emotion/styled';
import type { TypeOf } from '@kbn/typed-react-router-config';
import React, { useState } from 'react';
import { asDuration } from '../../../../../../common/utils/formatters';
import type { ErrorMark } from '../../../../app/transaction_details/waterfall_with_summary/waterfall_container/marks/get_error_marks';
import type { ApmRoutes } from '../../../../routing/apm_route_config';
import { ErrorDetailLink } from '../../../links/apm/error_detail_link';
import { Legend, Shape } from '../legend';

interface Props {
  mark: ErrorMark;
  query?: TypeOf<ApmRoutes, '/services/{serviceName}/errors/{groupId}'>['query'];
}

const Popover = styled.div`
  max-width: 280px;
`;

const ErrorLink = styled(ErrorDetailLink)`
  display: block;
  overflow-wrap: break-word;
`;

const Button = styled(Legend)`
  height: 20px;
  display: flex;
  align-items: flex-end;
`;

// We chose 240 characters because it fits most error messages and it's still easily readable on a screen.
function truncateMessage(errorMessage?: string) {
  const maxLength = 240;
  if (typeof errorMessage === 'string' && errorMessage.length > maxLength) {
    return errorMessage.substring(0, maxLength) + '…';
  } else {
    return errorMessage;
  }
}

export function ErrorMarker({ mark, query }: Props) {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, showPopover] = useState(false);

  const togglePopover = () => showPopover(!isPopoverOpen);

  const button = (
    <Button
      data-test-subj="popover"
      clickable
      color={euiTheme.colors.danger}
      shape={Shape.square}
      onClick={togglePopover}
    />
  );

  const { error } = mark;

  const errorMessage = error.error.log?.message || error.error.exception?.message;
  const truncatedErrorMessage = truncateMessage(errorMessage);

  return (
    <EuiPopover
      id="popover"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={togglePopover}
      anchorPosition="upCenter"
    >
      <Popover>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <Legend
              text={asDuration(mark.offset)}
              indicator={<div style={{ marginRight: euiTheme.size.xs }}>@</div>}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <Legend
              key={mark.serviceColor}
              color={mark.serviceColor}
              text={error.service.name}
              indicator={<span />}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            {mark.onClick === undefined && error.error.grouping_key && query ? (
              <EuiText size="s">
                <ErrorLink
                  data-test-subj="errorLink"
                  serviceName={error.service.name}
                  errorGroupId={error.error.grouping_key}
                  query={query}
                  title={errorMessage}
                >
                  {truncatedErrorMessage}
                </ErrorLink>
              </EuiText>
            ) : mark.onClick ? (
              <EuiButtonEmpty
                data-test-subj="apmTimelineErrorMarkerButton"
                onClick={() => {
                  togglePopover();
                  mark.onClick?.();
                }}
              >
                {truncatedErrorMessage}
              </EuiButtonEmpty>
            ) : (
              truncatedErrorMessage
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </Popover>
    </EuiPopover>
  );
}
