/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiPanel, EuiToolTip } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';
import { StaticIndexPattern } from 'ui/index_patterns';

import { HostsFilter } from '../../../containers/hosts';
import { NetworkFilter } from '../../../containers/network';
import { assertUnreachable } from '../../../lib/helpers';
import { hostsModel, KueryFilterQuery, networkModel } from '../../../store';
import { WithHoverActions } from '../../with_hover_actions';

import * as i18n from './translations';

interface Props {
  applyFilterQueryFromKueryExpression: (expression: string) => void;
  children: JSX.Element;
  expression: string;
  filterQueryDraft: KueryFilterQuery;
}

class AddToKqlComponent extends React.PureComponent<Props> {
  public render() {
    const { children } = this.props;
    return (
      <WithHoverActions
        hoverContent={
          <HoverActionsContainer data-test-subj="hover-actions-container">
            <EuiToolTip content={i18n.FILTER_FOR_VALUE}>
              <EuiIcon type="filter" onClick={this.addToKql} />
            </EuiToolTip>
          </HoverActionsContainer>
        }
        render={() => children}
      />
    );
  }

  private addToKql = () => {
    const { expression, filterQueryDraft, applyFilterQueryFromKueryExpression } = this.props;
    applyFilterQueryFromKueryExpression(
      filterQueryDraft && !isEmpty(filterQueryDraft.expression)
        ? `${filterQueryDraft.expression} and ${expression}`
        : expression
    );
  };
}

const HoverActionsContainer = styled(EuiPanel)`
  align-items: center;
  display: flex;
  flex-direction: row;
  height: 25px;
  justify-content: center;
  left: 5px;
  position: absolute;
  top: -10px;
  width: 30px;
  cursor: pointer;
`;

interface AddToKqlProps {
  children: JSX.Element;
  indexPattern: StaticIndexPattern;
  expression: string;
  componentFilterType: 'network' | 'hosts';
  type: networkModel.NetworkType | hostsModel.HostsType;
}

export const AddToKql = pure<AddToKqlProps>(
  ({ children, expression, type, componentFilterType, indexPattern }) => {
    switch (componentFilterType) {
      case 'hosts':
        return (
          <HostsFilter indexPattern={indexPattern} type={type as hostsModel.HostsType}>
            {({ applyFilterQueryFromKueryExpression, filterQueryDraft }) => (
              <AddToKqlComponent
                applyFilterQueryFromKueryExpression={applyFilterQueryFromKueryExpression}
                expression={expression}
                filterQueryDraft={filterQueryDraft}
              >
                {children}
              </AddToKqlComponent>
            )}
          </HostsFilter>
        );
      case 'network':
        return (
          <NetworkFilter indexPattern={indexPattern} type={type as networkModel.NetworkType}>
            {({ applyFilterQueryFromKueryExpression, filterQueryDraft }) => (
              <AddToKqlComponent
                applyFilterQueryFromKueryExpression={applyFilterQueryFromKueryExpression}
                expression={expression}
                filterQueryDraft={filterQueryDraft}
              >
                {children}
              </AddToKqlComponent>
            )}
          </NetworkFilter>
        );
    }
    assertUnreachable(componentFilterType, 'Unknown Filter Type in switch statement');
  }
);
