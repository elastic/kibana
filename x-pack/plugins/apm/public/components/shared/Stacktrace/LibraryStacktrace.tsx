/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAccordion } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import { Stackframe } from '../../../../typings/es_schemas/raw/fields/stackframe';
import { px, units } from '../../../style/variables';
import { Stackframe as StackframeComponent } from './Stackframe';

const LibraryStacktraceAccordion = styled(EuiAccordion)`
  margin: ${px(units.quarter)} 0;
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
