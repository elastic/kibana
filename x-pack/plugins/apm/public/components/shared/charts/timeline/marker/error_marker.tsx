/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopover, EuiText } from '@elastic/eui';
import React, { useState } from 'react';
import { euiStyled } from '../../../../../../../../../src/plugins/kibana_react/common';
import {
  TRACE_ID,
  TRANSACTION_ID,
} from '../../../../../../common/elasticsearch_fieldnames';
import { asDuration } from '../../../../../../common/utils/formatters';
import { useLegacyUrlParams } from '../../../../../context/url_params_context/use_url_params';
import { useTheme } from '../../../../../hooks/use_theme';
import { ErrorMark } from '../../../../app/transaction_details/waterfall_with_summary/waterfall_container/marks/get_error_marks';
import { ErrorDetailLink } from '../../../links/apm/error_detail_link';
import { Legend, Shape } from '../legend';

interface Props {
  mark: ErrorMark;
}

const Popover = euiStyled.div`
  max-width: 280px;
`;

const TimeLegend = euiStyled(Legend)`
  margin-bottom: ${({ theme }) => theme.eui.euiSize};
`;

const ErrorLink = euiStyled(ErrorDetailLink)`
  display: block;
  margin: ${({ theme }) => `${theme.eui.euiSizeS} 0 ${theme.eui.euiSizeS} 0`};
  overflow-wrap: break-word;
`;

const Button = euiStyled(Legend)`
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

export function ErrorMarker({ mark }: Props) {
  const theme = useTheme();
  const { urlParams } = useLegacyUrlParams();
  const [isPopoverOpen, showPopover] = useState(false);

  const togglePopover = () => showPopover(!isPopoverOpen);

  const button = (
    <Button
      data-test-subj="popover"
      clickable
      color={theme.eui.euiColorDanger}
      shape={Shape.square}
      onClick={togglePopover}
    />
  );

  const { error } = mark;

  const { rangeTo, rangeFrom } = urlParams;

  const query = {
    kuery: [
      ...(error.trace?.id ? [`${TRACE_ID} : "${error.trace?.id}"`] : []),
      ...(error.transaction?.id
        ? [`${TRANSACTION_ID} : "${error.transaction?.id}"`]
        : []),
    ].join(' and '),
    rangeFrom,
    rangeTo,
  };

  const errorMessage =
    error.error.log?.message || error.error.exception?.[0]?.message;
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
        <TimeLegend
          text={asDuration(mark.offset)}
          indicator={<div style={{ marginRight: theme.eui.euiSizeXS }}>@</div>}
        />
        <Legend
          key={mark.serviceColor}
          color={mark.serviceColor}
          text={error.service.name}
          indicator={<span />}
        />
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
      </Popover>
    </EuiPopover>
  );
}
