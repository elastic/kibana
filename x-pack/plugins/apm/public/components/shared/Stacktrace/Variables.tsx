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
import { borderRadius, px, unit, units } from '../../../style/variables';
import { Stackframe } from '../../../../typings/es_schemas/raw/fields/stackframe';
import { KeyValueTable } from '../KeyValueTable';
import { flattenObject } from '../../../utils/flattenObject';

const VariablesContainer = euiStyled.div`
  background: ${({ theme }) => theme.eui.euiColorEmptyShade};
  border-radius: 0 0 ${borderRadius} ${borderRadius};
  padding: ${px(units.half)} ${px(unit)};
`;

interface Props {
  vars: Stackframe['vars'];
}

export function Variables({ vars }: Props) {
  if (!vars) {
    return null;
  }
  const flattenedVariables = flattenObject(vars);
  return (
    <React.Fragment>
      <VariablesContainer>
        <EuiAccordion
          id="local-variables"
          className="euiAccordion"
          buttonContent={i18n.translate(
            'xpack.apm.stacktraceTab.localVariablesToogleButtonLabel',
            { defaultMessage: 'Local variables' }
          )}
        >
          <React.Fragment>
            <KeyValueTable keyValuePairs={flattenedVariables} />
          </React.Fragment>
        </EuiAccordion>
      </VariablesContainer>
    </React.Fragment>
  );
}
