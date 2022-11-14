/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDatePicker, EuiFormRow, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { Moment } from 'moment';
import moment from 'moment';
import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import * as i18n from './translations';

interface ExceptionItmeExpireTimeProps {
  expireTime: Moment | undefined;
  setExpireTime: (date: Moment | undefined) => void;
}

const SectionHeader = styled(EuiTitle)`
  ${() => css`
    font-weight: ${({ theme }) => theme.eui.euiFontWeightSemiBold};
  `}
`;

const ExceptionItemExpireTime: React.FC<ExceptionItmeExpireTimeProps> = ({
  expireTime,
  setExpireTime,
}): JSX.Element => {
  const [dateTime, setDateTime] = useState<Moment | undefined>(expireTime);

  const handleChange = (date: Moment | null) => {
    setDateTime(date ?? undefined);
    setExpireTime(date ?? undefined);
  };

  return (
    <div>
      <SectionHeader size="xs">
        <h3>{i18n.EXCEPTION_EXPIRE_TIME_HEADER}</h3>
      </SectionHeader>
      <EuiSpacer size="s" />
      <EuiFormRow label={i18n.EXPIRE_TIME_LABEL}>
        <EuiDatePicker
          showTimeSelect
          selected={dateTime}
          onChange={handleChange}
          onClear={() => handleChange(null)}
          minDate={moment()}
        />
      </EuiFormRow>
    </div>
  );
};

export const ExceptionsExpireTime = React.memo(ExceptionItemExpireTime);

ExceptionsExpireTime.displayName = 'ExceptionsExpireTime';
