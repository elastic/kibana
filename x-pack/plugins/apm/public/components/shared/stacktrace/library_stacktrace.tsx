/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { Stackframe } from '../../../../typings/es_schemas/raw/fields/stackframe';
import { Stackframe as StackframeComponent } from './stackframe';

const LibraryStacktraceAccordion = euiStyled(EuiAccordion)`
  margin: ${({ theme }) => theme.eui.euiSizeXS} 0;
`;

interface Props {
  codeLanguage?: string;
  stackframes: Stackframe[];
  id: string;
}

export function LibraryStacktrace({ codeLanguage, id, stackframes }: Props) {
  if (stackframes.length === 0) {
    return null;
  }

  return (
    <LibraryStacktraceAccordion
      buttonContent={i18n.translate(
        'xpack.apm.stacktraceTab.libraryFramesToogleButtonLabel',
        {
          defaultMessage:
            '{count, plural, one {# library frame} other {# library frames}}',
          values: { count: stackframes.length },
        }
      )}
      data-test-subj="LibraryStacktraceAccordion"
      id={id}
    >
      {stackframes.map((stackframe, i) => (
        <StackframeComponent
          key={i}
          id={i.toString(10)}
          isLibraryFrame
          codeLanguage={codeLanguage}
          stackframe={stackframe}
        />
      ))}
    </LibraryStacktraceAccordion>
  );
}
