/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import { IStackframe } from 'x-pack/plugins/apm/typings/es_schemas/fields/Stackframe';
import {
  borderRadius,
  colors,
  fontFamily,
  px,
  unit,
  units
} from '../../../style/variables';
// @ts-ignore
import { Ellipsis } from '../Icons';
import { PropertiesTable } from '../PropertiesTable';

const VariablesContainer = styled.div`
  background: ${colors.white};
  border-top: 1px solid ${colors.gray4};
  border-radius: 0 0 ${borderRadius} ${borderRadius};
  padding: ${px(units.half)} ${px(unit)};
  font-family: ${fontFamily};
`;

const VariablesToggle = styled.a`
  display: block;
  cursor: pointer;
  user-select: none;
`;

const VariablesTableContainer = styled.div`
  padding: ${px(units.plus)} ${px(unit)} 0;
`;

interface Props {
  vars: IStackframe['vars'];
}

export class Variables extends React.Component<Props> {
  public state = {
    isVisible: false
  };

  public onClick = () => {
    this.setState(() => ({ isVisible: !this.state.isVisible }));
  };

  public render() {
    if (!this.props.vars) {
      return null;
    }

    return (
      <VariablesContainer>
        <VariablesToggle onClick={this.onClick}>
          <Ellipsis
            horizontal={this.state.isVisible}
            style={{ marginRight: units.half }}
          />{' '}
          {i18n.translate(
            'xpack.apm.stacktraceTab.localVariablesToogleButtonLabel',
            { defaultMessage: 'Local variables' }
          )}
        </VariablesToggle>
        {this.state.isVisible && (
          <VariablesTableContainer>
            <PropertiesTable propData={this.props.vars} propKey={'custom'} />
          </VariablesTableContainer>
        )}
      </VariablesContainer>
    );
  }
}
