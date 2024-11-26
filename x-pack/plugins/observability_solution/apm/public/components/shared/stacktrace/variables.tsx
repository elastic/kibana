/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAccordion, type EuiThemeComputed, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { Stackframe } from '../../../../typings/es_schemas/raw/fields/stackframe';
import { KeyValueTable } from '../key_value_table';
import { flattenObject } from '../../../../common/utils/flatten_object';

const VariablesContainer = euiStyled.div<{ euiTheme: EuiThemeComputed }>`
  background: ${({ euiTheme }) => euiTheme.colors.emptyShade};
  border-radius: 0 0 ${({ euiTheme }) =>
    `${euiTheme.border.radius.small} ${euiTheme.border.radius.small}`};
  padding:  ${({ euiTheme }) => `${euiTheme.size.s} ${euiTheme.size.m}`};
`;

interface Props {
  vars: Stackframe['vars'];
}

export function Variables({ vars }: Props) {
  const { euiTheme } = useEuiTheme();
  if (!vars) {
    return null;
  }
  const flattenedVariables = flattenObject(vars);
  return (
    <React.Fragment>
      <VariablesContainer euiTheme={euiTheme}>
        <EuiAccordion
          id="local-variables"
          className="euiAccordion"
          buttonContent={i18n.translate('xpack.apm.stacktraceTab.localVariablesToogleButtonLabel', {
            defaultMessage: 'Local variables',
          })}
        >
          <React.Fragment>
            <KeyValueTable keyValuePairs={flattenedVariables} />
          </React.Fragment>
        </EuiAccordion>
      </VariablesContainer>
    </React.Fragment>
  );
}
