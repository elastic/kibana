/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { i18n } from '@kbn/i18n';
import { EuiAccordion, EuiTitle } from '@elastic/eui';
import { px, unit, units } from '../../../style/variables';
import { Stacktrace } from '.';
import { Stackframe } from '../../../../typings/es_schemas/raw/fields/stackframe';

const Accordion = styled(EuiAccordion)`
  border-top: ${({ theme }) => theme.eui.euiBorderThin};
  margin-top: ${px(units.half)};
`;

const CausedByContainer = styled('h5')`
  padding: ${({ theme }) => theme.eui.spacerSizes.s} 0;
`;

const CausedByHeading = styled('span')`
  color: ${({ theme }) => theme.eui.textColors.subdued};
  display: block;
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  font-weight: ${({ theme }) => theme.eui.euiFontWeightBold};
  text-transform: uppercase;
`;

const FramesContainer = styled('div')`
  padding-left: ${px(unit)};
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
