/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';

import * as i18n from './translations';

const EmptyString = styled.span`
  color: ${({
    theme: {
      eui: { euiColorMediumShade },
    },
  }) => euiColorMediumShade};
`;

export const getEmptyString = () => `(${i18n.EMPTY_STRING})`;

export const getEmptyStringTag = () => <EmptyString>{getEmptyString()}</EmptyString>;

export const getOrEmptyStringTag = (text: string) =>
  text === '' ? getEmptyStringTag() : <>{text}</>;
