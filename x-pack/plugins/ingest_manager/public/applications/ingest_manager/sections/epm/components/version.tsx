/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { RequirementVersion } from '../../../types';

const CodeText = styled.span`
  font-family: ${(props) => props.theme.eui.euiCodeFontFamily};
`;
export function Version({
  className,
  version,
}: {
  className?: string;
  version: RequirementVersion;
}) {
  return <CodeText className={className}>{version}</CodeText>;
}
