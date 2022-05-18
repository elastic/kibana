/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { Stacktrace } from '.';
import { Stackframe } from '../../../../typings/es_schemas/raw/fields/stackframe';

const Accordion = euiStyled(EuiAccordion)`
  border-top: ${({ theme }) => theme.eui.euiBorderThin};
  margin-top: ${({ theme }) => theme.eui.euiSizeS};
`;

const CausedByContainer = euiStyled('h5')`
  padding: ${({ theme }) => theme.eui.spacerSizes.s} 0;
`;

const CausedByHeading = euiStyled('span')`
  color: ${({ theme }) => theme.eui.euiTextSubduedColor};
  display: block;
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  font-weight: ${({ theme }) => theme.eui.euiFontWeightBold};
  text-transform: uppercase;
`;

const FramesContainer = euiStyled('div')`
  padding-left: ${({ theme }) => theme.eui.paddingSizes.m};
`;

function CausedBy({ message }: { message: string }) {
  return (
    <CausedByContainer>
      <CausedByHeading>
        {i18n.translate(
          'xpack.apm.stacktraceTab.causedByFramesToogleButtonLabel',
          {
            defaultMessage: 'Caused By',
          }
        )}
      </CausedByHeading>
      <EuiTitle size="xxs">
        <span>{message}</span>
      </EuiTitle>
    </CausedByContainer>
  );
}

interface CauseStacktraceProps {
  codeLanguage?: string;
  id: string;
  message?: string;
  stackframes?: Stackframe[];
}

export function CauseStacktrace({
  codeLanguage,
  id,
  message = '…',
  stackframes = [],
}: CauseStacktraceProps) {
  if (stackframes.length === 0) {
    return <CausedBy message={message} />;
  }

  return (
    <Accordion buttonContent={<CausedBy message={message} />} id={id}>
      <FramesContainer>
        <Stacktrace stackframes={stackframes} codeLanguage={codeLanguage} />
      </FramesContainer>
    </Accordion>
  );
}
